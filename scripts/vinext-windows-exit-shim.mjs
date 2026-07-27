// Vinext 0.0.50 force-exits immediately after closing its prerender server.
// On Windows with Node 24, libuv can still be finalizing that async handle and
// aborts with UV_HANDLE_CLOSING. Let successful builds drain naturally while
// preserving Vinext's immediate exit behavior for genuine failures.
if (process.platform === "win32" && Number.parseInt(process.versions.node, 10) >= 24) {
  const nativeExit = process.exit.bind(process);

  process.exit = (code = process.exitCode ?? 0) => {
    if (code === 0) {
      process.exitCode = 0;
      return;
    }

    nativeExit(code);
  };
}
