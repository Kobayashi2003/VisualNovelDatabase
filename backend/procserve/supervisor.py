import logging
import signal
import subprocess
import sys
import threading
import time
from typing import Dict, List, Optional

from .spec import ProcSpec


class Supervisor:
    """Owns the lifecycle of a list of ProcSpecs.

    Usage:
        Supervisor(specs, logger=...).run()

    `run()` topologically starts every spec, installs a Ctrl+C handler that
    tears them down in reverse-topological order, and blocks until either
    a signal fires or KeyboardInterrupt escapes the sleep loop.

    The class is intentionally small. Auto-restart, health probes, and a
    status CLI are deliberate non-goals for this scope — see the module
    docstring for the growth path."""

    def __init__(self, specs: List[ProcSpec], logger: Optional[logging.Logger] = None):
        self.specs = specs
        self.logger = logger or logging.getLogger(__name__)
        self.processes: Dict[str, subprocess.Popen] = {}
        self._lock = threading.Lock()
        self._stopping = False

    # ---------- ordering ----------------------------------------------------

    def _topological_order(self) -> List[ProcSpec]:
        """Kahn's algorithm over ProcSpec.depends_on.

        Edges that point at names not in the spec list are dropped (treated
        as already-satisfied). This is what lets the spec-maker pattern
        work: when `make_postgres_spec()` returns None because `postgres`
        isn't on PATH, a downstream spec with `depends_on=["postgres"]`
        still starts — its dep is just "out of scope" rather than missing."""
        by_name = {s.name: s for s in self.specs}
        present = set(by_name)
        in_degree = {
            s.name: sum(1 for d in s.depends_on if d in present)
            for s in self.specs
        }
        ready = [name for name, n in in_degree.items() if n == 0]
        ordered: List[ProcSpec] = []
        seen = set()
        while ready:
            name = ready.pop(0)
            if name in seen:
                continue
            seen.add(name)
            ordered.append(by_name[name])
            for s in self.specs:
                if s.name in seen:
                    continue
                if name in s.depends_on:
                    in_degree[s.name] -= 1
                    if in_degree[s.name] == 0:
                        ready.append(s.name)
        if len(ordered) < len(self.specs):
            missing = [s.name for s in self.specs if s.name not in seen]
            raise ValueError(f"ProcSpec cycle or unresolved deps: {missing}")
        return ordered

    # ---------- launch / shutdown ------------------------------------------

    def _start_one(self, spec: ProcSpec) -> None:
        print(f"{spec.prefix} starting")
        self.logger.info(f"{spec.prefix} starting: {' '.join(spec.cmd)}")
        try:
            proc = subprocess.Popen(
                spec.cmd,
                cwd=spec.cwd,
                env=spec.env,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
            )
        except (FileNotFoundError, OSError) as e:
            # FileNotFoundError is the common case (binary vanished between
            # the spec-maker's PATH check and now). OSError covers permission
            # / arg-list-too-long / etc. Don't crash the whole supervisor
            # on one bad child — log it and continue with the rest.
            self.logger.error(f"{spec.prefix} failed to spawn: {e}")
            print(f"\n!!! {spec.prefix} failed to spawn: {e}\n", file=sys.stderr)
            return

        with self._lock:
            self.processes[spec.name] = proc
        threading.Thread(
            target=self._pump_logs, args=(spec, proc), daemon=True
        ).start()

    def _pump_logs(self, spec: ProcSpec, proc: subprocess.Popen) -> None:
        # proc.stdout is text-mode with stderr merged in. Iterating yields
        # lines as the child flushes them; the loop exits when the child
        # closes its stdout (i.e. it exited).
        assert proc.stdout is not None
        for line in proc.stdout:
            line = line.rstrip("\n")
            self.logger.info(f"{spec.prefix} {line}")
            print(f"{spec.prefix} {line}")

    def start_all(self) -> None:
        for spec in self._topological_order():
            self._start_one(spec)

    def stop_all(self) -> None:
        """Terminate every running child in reverse-topological order.

        Reverse-topo means dependents (Flask) go down before their deps
        (Postgres) — avoids a tail of "connection refused" log spam from
        Flask while Postgres is already gone."""
        with self._lock:
            if self._stopping:
                return
            self._stopping = True

        order = list(reversed(self._topological_order()))
        for spec in order:
            proc = self.processes.get(spec.name)
            if proc is None or proc.poll() is not None:
                continue
            try:
                proc.terminate()
                proc.wait(timeout=3)
            except subprocess.TimeoutExpired:
                proc.kill()
            except Exception as e:
                self.logger.error(f"{spec.prefix} terminate failed: {e}")
                print(f"{spec.prefix} terminate failed: {e}", file=sys.stderr)

    # ---------- introspection ----------------------------------------------

    def status(self) -> Dict[str, str]:
        """Snapshot of {name: state}. Useful for future CLI / HTTP probes;
        not currently called from the launchers."""
        out: Dict[str, str] = {}
        for spec in self.specs:
            proc = self.processes.get(spec.name)
            if proc is None:
                out[spec.name] = "not-started"
            elif proc.poll() is None:
                out[spec.name] = "running"
            else:
                out[spec.name] = f"exited:{proc.returncode}"
        return out

    # ---------- main entrypoint --------------------------------------------

    def run(self) -> None:
        """Start everything, install signal handlers, block forever."""

        def handler(signum, frame):
            print("\nReceived interrupt; terminating processes...")
            self.stop_all()
            sys.exit(0)

        # Windows has no SIGTERM and SIGINT only reaches us when the console
        # has focus; SIGBREAK (Ctrl+Break) covers the "another tool killed
        # the parent" case. Mirror the original run.py wiring.
        if sys.platform == "win32":
            signal.signal(signal.SIGBREAK, handler)
        signal.signal(signal.SIGINT, handler)
        if sys.platform != "win32":
            signal.signal(signal.SIGTERM, handler)

        self.start_all()

        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            handler(signal.SIGINT, None)
