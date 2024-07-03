# spaces-dl

A dead CLI tool to download recorded Twitter Spaces.

## Installation

You can install `spaces-dl` globally using npm:

```shell
npm install -g spaces-dl
```

## Usage

```shell
spaces-dl [options]
```

### Options

- -m, --m3u8: Specify the m3u8 file URL.
- -i, --id <id>: Provide a valid ID for a recorded Twitter Space.
- -u, --username <username>: Specify a valid Twitter username (without the @).
- -p, --password <password>: Provide the password for the specified Twitter username.
- -o, --output <path>: Specify the output path for the recorded audio/video.
- -d, --disable-browser-login: Disable logging in with the browser if logging in with username and password fails.
- -b, --browser-login: Login with the browser instead (great for privacy).

### Example

```shell
spaces-dl -i <space_id> -u example_user -p password123 -o ./downloads
```
