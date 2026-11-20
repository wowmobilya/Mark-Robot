# Release 184: top notifications and nested bank entry

Release 183 live verification confirmed the new reader opens from the original robot face, minimizes and reopens the retained report, and exits. Company logo draft changes survive the nested bank dialog. Smart-card Cancel restores page order and card size. Robot preview speed restores the saved value. The TCMB reference feed successfully committed a quote with source and publication date on the deployed application.

Two cascade conflicts found during live verification are fixed:

- Remove the older ui-identity toast rules that forced notifications to the bottom with !important.
- Anchor notifications to the active dialog or report panel using a local absolute position; page notifications remain fixed below the top controls.
- Increase the company bank-tile hiding selector specificity so the shared settings grid cannot display the duplicate standalone tile. Bank accounts remain accessible inside Company information.

Validation before publication: all 12 inline scripts parse, all 68 versioned local script/style references resolve, and the scoped diff whitespace check passes. These UI-only corrections do not change the voice pack, models, saved data, or speech algorithms.

Voice limitation: the cloud browser does not support WebGPU, so generated Mark report audio and actual cold-start latency could not be verified on hardware here. Release 183 includes the startup and tempo fixes, and their focused tests pass. The saved recording is a separate playback path and is not treated as generated-report proof.
