from dataclasses import dataclass, field
from typing import Dict, List, Optional


@dataclass
class ProcSpec:
    """Declarative description of one supervised child process.

    A spec is data — no side effects at construction time. The Supervisor
    reads the list, sorts by `depends_on`, and launches each as a
    subprocess.Popen with stdout/stderr merged into one pipe so the log
    pump thread can prefix every line uniformly.

    Fields:
      name        Unique identifier across the spec list. Doubles as the
                  default log prefix (uppercased).
      cmd         argv list for subprocess.Popen. Pre-resolve the binary
                  path (shutil.which) when the spec-maker also gates on
                  binary existence — avoids a second PATH lookup at spawn.
      depends_on  Names of other specs that must START before this one.
                  Not a readiness check — just ordering. If a referenced
                  name is absent from the spec list (e.g. its spec-maker
                  returned None because the binary was missing), the dep
                  is treated as already-satisfied so the rest still runs.
      cwd, env    Forwarded to subprocess.Popen as-is. Leave env=None to
                  inherit os.environ.
      log_prefix  Override for the log prefix (default: f"[{NAME}]").
    """

    name: str
    cmd: List[str]
    depends_on: List[str] = field(default_factory=list)
    cwd: Optional[str] = None
    env: Optional[Dict[str, str]] = None
    log_prefix: Optional[str] = None

    @property
    def prefix(self) -> str:
        return self.log_prefix or f"[{self.name.upper()}]"
