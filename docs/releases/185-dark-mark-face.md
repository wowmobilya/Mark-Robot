# Release 185: dark-mode Mark face contrast

Live verification of release 184 confirmed that top notifications appear within the active window and dismiss automatically, the duplicate bank tile is hidden, smart-card size saves, and the report drag grip moves the compact reader between top and bottom.

A final contrast fix applies the reader's existing light faceplate to the dashboard robot and settings preview in dark mode. The original black face artwork and light theme are unchanged. Only robot-face.css and its cache version change; there are no voice-model, stored-data, or playback changes.

The cloud browser remains unable to verify WebGPU synthesis on the user's hardware. The additional narrow report-startup review passed 11 existing activation, timeout, and error-propagation tests without finding a further blocker.
