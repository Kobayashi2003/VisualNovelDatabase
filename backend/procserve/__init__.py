"""procserve — small in-process supervisor for the backend's child processes.

The launcher used to be a flat list of subprocess.Popen calls in run.py/prod.py
with one log-pump thread per process and a single signal handler that ran
.terminate() over a Python list. As the stack grew (postgres + redis + 2
celery workers + 2 flowers + 3 flask servers + caddy = 9+ processes), that
shape stopped scaling: start order was implicit (whatever line came first),
crashes went unnoticed until a downstream request 502'd, and there was no
single place to ask "is the stack up?".

procserve replaces that with two pieces:

  - ProcSpec — declarative description of one child (name, cmd, env, deps).
    Spec-makers in the launchers build a list of these.

  - Supervisor — owns the lifecycle: topological start (deps before
    dependents), per-process log aggregation, reverse-topological shutdown
    on signal.

This is the lighter scope intentionally: no health probes, no auto-restart,
no CLI. Hooks for those exist (status(), the depends_on graph, per-spec
prefix) so they can be added when a real outage points at a specific gap."""

from .spec import ProcSpec
from .supervisor import Supervisor

__all__ = ["ProcSpec", "Supervisor"]
