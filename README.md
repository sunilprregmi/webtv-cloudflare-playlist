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
    * **Session Cookie**: Supports direct access using existing cookies, including Google Session.
    * **JSON Token**: Authenticate using saved token data or Google Session JSON.
* **Dynamic Playlist**: Real-time M3U8 generation compatible with VLC, Kodi, and IPTV players.
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
3.  **Authentication**: Access the root URL of your worker to login and generate the initial session.

---

## Usage

Once authenticated, your playlist is available at:
`https://<your-worker>.workers.dev/playlist`

### Automated Refresh
To maintain a continuous session without manual login:
1.  Use [cron-job.org](https://cron-job.org) or Cloudflare Triggers.
2.  Target: `https://<your-worker>.workers.dev/refresh`
3.  Interval: Every 23-24 hours.

---

## Security and Disclaimer

* **Private Use**: This is a private server. Do not share your playlist URL or tokens.
* **Responsibility**: Users are responsible for complying with local streaming regulations and copyright laws.
* **Affiliation**: This project is independent and not affiliated with NetTV Nepal, GeniusSystem, NewITVenture, or WorldLink.

---

## Author
**Sunil Prasad Regmi**
[Facebook](https://www.facebook.com/sunilprregmi/) | [Telegram](https://t.me/sunilpr)
