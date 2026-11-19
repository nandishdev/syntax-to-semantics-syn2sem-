# Syn2Sem IDE connector

The VS Code and Antigravity buttons open the translated code in the IDE selected by the user. Browsers do not let a website launch desktop apps directly, so Windows users need the small Syn2Sem connector installed once.

## One-time Windows setup

1. Install Node.js if it is not already installed.
2. In Syn2Sem, translate code and click either IDE button. If the connector is not installed, the site downloads the setup file.
3. Open `Syn2Sem-IDE-Helper-Setup.cmd` from the browser's Downloads list and approve the Windows prompt. The installer registers the connector to start automatically when you sign in.
4. Return to Syn2Sem and click the IDE button again. The translated code opens in the selected IDE.

The selected IDE must be installed. The connector looks for its command-line launcher on PATH and in the usual Windows install locations (including the `antigravity-ide` launcher). If it cannot find or start the selected IDE, Syn2Sem reports that instead of claiming success.

The connector only listens on `127.0.0.1:43127`, accepts requests from the deployed Syn2Sem site and local development site, checks the selected IDE and language, and writes the translated code to a temporary file with the correct extension before opening it. It does not send code to the Vercel server to open a desktop application.

For local development, run `npm run ide-helper` from this folder. Set `SYN2SEM_IDE_HELPER_PORT` only if you also update the website's connector URL.
