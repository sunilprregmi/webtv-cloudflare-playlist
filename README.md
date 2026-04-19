# WebTV Cloudflare Playlist

A Cloudflare Workers script that dynamically generates M3U8 playlists using the NetTV Nepal WebTV API. This project provides a secure, serverless way to manage and stream FTA Nepalese and international channels on any device.

---

## Project Overview

This is a lightweight, personal-use tool designed to interface with official NetTV WebTV platforms. It is hosted entirely on Cloudflare Workers, requiring no external backend or server maintenance.

* **Serverless**: Runs on Cloudflare's global edge network.
* **Responsive**: Features a clean mobile and desktop login UI.
* **Flexible Auth**: Supports Ncell OTP, Cookies, and JSON tokens (including Google Session support).
* **Automated**: Handles session refreshes and WMS signature fetching.

---

## Key Features

* **Authentication Options**:
    * **Ncell OTP**: Login via mobile number and one-time password.
    * **Session Cookie**: Supports direct access using existing `Netscape Cookies`, including Google Session.
    * **JSON Token**: Authenticate using saved token data or Google Session JSON.
* **Dynamic Playlist**: Real-time M3U8 generation compatible with VLC*, Kodi, and IPTV players.
* **Category Mapping**: Automatically groups channels by genre with priority sorting.
* **Secure Storage**: Credentials and tokens are stored in private Cloudflare KV namespaces.
* **WMS Support**: Integrated fetching of authentication signatures for stream playback.

---

## API Endpoints

| Method | Path | Description |
| :--- | :--- | :--- |
| GET | `/login` | Login UI (Ncell, Cookie, Token) |
| GET | `/playlist` | Generates M3U8 playlist (Auth required) |
| GET | `/api` | Structured JSON metadata for channels/categories |
| GET | `/refresh` | Manually triggers a session token refresh |
| GET | `/wms` | Retrieves current WMS authentication signature |

---

## Setup Guide

1.  **Deploy Code**: Copy `workers.js` into a new Cloudflare Worker.
2.  **KV Namespace**: 
    * Create a KV namespace named `geniusTVtoken`.
    * Bind it to your Worker with the variable name `geniusTVtoken`.
3.  **Authentication**: Access the `/login` path of your worker to login and generate the initial session.

---

## Usage

Once authenticated, your playlist is available at:
`https://<your-worker>.workers.dev/playlist`

### Automated Refresh
To maintain a continuous session without manual login:
#### Recommended : Cloudflare Triggers
1. Go To `Settings > Trigger Events > +Add > Cron Triggers`.
2. Choose `Execute Worker every > Day of the month` from dropdown.
3. Leave second dropdown `Every day` as-is.
4. Uncheck `Last day of month` as-is
5. Set any prefered time on `At UTC Time`
6. Click on `ADD` button at bottom right.

#### Optional : Cron-Job Console
1.  Make account on [cron-job.org](https://console.cron-job.org/).
2.  Target: `https://<your-worker>.workers.dev/refresh`
3.  Interval: Every 23-24 hours.

---

## Security and Disclaimer

* **Educational Purpose**: This project is developed as a technical study in serverless architecture, API scraping, and IPTV middleware. It is provided "as-is" for educational and personal research purposes only.
* **Private Use Only**: This is a private tool. Sharing your deployed Worker URL, M3U8 playlist links, or session tokens can lead to your account being flagged or banned by the service provider. **Do not host this publicly.**
* **Zero-Logging Policy**: While the script manages tokens via Cloudflare KV, ensure you do not log sensitive headers (like `Authorization` or `Set-Cookie`) to Cloudflare’s real-time logs unless debugging.
* **User Responsibility**: The end-user is solely responsible for how this tool is used. You must ensure that your access to streams complies with your local digital rights management (DRM) laws and the Terms of Service of the respective content providers. 
* **Non-Commercial**: This software is not for sale and should not be bundled with any paid IPTV services.
* **Affiliation**: This project is an independent open-source contribution. It is **not** endorsed, certified, or affiliated with::
    * **New IT Venture Corporation**,
    * **Genius Systems**,
    * **Kalash Services**,
    * **NITV Telecom**,
    * **Net TV Nepal**,
    * **Network TV**,
    * **World Link**,
    * **Ncell**,
    * Any other ISP, IPTV provider, or content aggregator operating in the Nepal or international markets.
* **Trademarks**: All product names, logos, and brands are the property of their respective owners. The use of these names does not imply any relationship or endorsement.
* **Limitation of Liability**: The developer (myself) assumes no responsibility for service interruptions, account suspensions, or any legal consequences arising from the use of this script. Use of this tool is at your own risk.
