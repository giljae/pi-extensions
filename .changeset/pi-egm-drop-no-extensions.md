---
"@giljae/pi-egm": patch
---

Stop passing `--no-extensions` to the reviewer child. It disabled provider
extensions, so a reviewer could not reach a model. Tool isolation now comes
from the `--tools read,grep,find,ls` allowlist. Verified live on Pi 1.5.2.
