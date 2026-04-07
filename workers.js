const common_header = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:149.0) Gecko/20100101 Firefox/149.0',
  'Accept': '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br, zstd',
  'Referer': 'https://webtv.nettv.com.np/',
  'Origin': 'https://webtv.nettv.com.np',
  'Connection': 'keep-alive',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'cross-site'
};

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(req) {
  const url = new URL(req.url);
  const path = url.pathname;

  if (req.method === 'GET') {
    if (path === '/login') return renderLoginPage();
    if (path === '/playlist') return handlePlaylistRequest(url.origin);
    if (path === '/refresh') return handleRefreshToken();
    if (path === '/wms') return handleWmsRequest();
    if (path === '/api') return handleApiRequest();
    if (path.endsWith('playlist.m3u8')) return handleProxyStream(req);
  }

  if (req.method === 'POST') {
    if (path === '/get-otp') return handleGetOtp(req);
    if (path === '/login') return handleUnifiedLogin(req);
  }

  return new Response('Not Found!', { status: 404 });
}

async function handlePlaylistRequest(workerOrigin) {
  const data = await geniusTVtoken.get('Login');
  if (!data) return new Response('Unauthorized', { status: 302, headers: {'Location': '/login'} });

  const json = JSON.parse(data);
  const jwt = JSON.parse(atob(json.access_token.split('.')[1]));
  const authHeaders = { ...common_header, 'Authorization': `Bearer ${json.access_token}` };

  const res = await fetch(`https://ott-livetv-resources.geniustv.geniussystems.com.np/subscriber/livetv/v1/namespaces/${jwt.params.reseller_id}/subscribers/${jwt.sub}/serial/${jwt.params.serial}`, { headers: authHeaders });
  if (!res.ok) return new Response('Session Expired', { status: 401 });

  const body = await res.json();
  const categories = body.result.categories.sort((a, b) => a.priority - b.priority);
  const map = body.result.category_channel_map.filter(m => m.category_id !== 20);
  const channels = body.result.channels.sort((a, b) => a.channel_number - b.channel_number);

  const grouped = {};
  channels.forEach(ch => {
    const cats = map.filter(m => m.channel_id === ch.id)
      .map(m => categories.find(c => c.id === m.category_id)?.category || 'Uncategorized');
    cats.forEach(cat => {
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(ch);
    });
  });

  let m3u8 = `#EXTM3U x-tvg-url="https://epgs.sunilprasad.com.np/webtv.xml.gz"\n`;
	  m3u8 += '# FOSS Project Of Sunil Prasad @ sunilprasad.com.np\n\n';
	  m3u8 += '# STRICT WARNING: This is a private server.\n';
	  m3u8 += '# No one is authorized to use this except owner him/herself.\n';
	  m3u8 += '# Do not share, misuse, or attempt to access these tokens or credentials.\n';
	  m3u8 += '# Providers can open issue on github for any discussions.\n';
	  m3u8 += '# Unauthorized access or takedown attempts will face legal consequences.\n\n';

  for (const cat of categories) {
    const name = cat.category;
    if (!grouped[name]) continue;

    for (const ch of grouped[name]) {
      const originalPath = new URL(ch.channel_urls[0].path);
      const hostPrefix = originalPath.hostname.split('.')[0];
      
      m3u8 += `#EXTINF:-1 tvg-id="${ch.id}" tvg-chno="${ch.channel_number}" tvg-name="${ch.name.toLowerCase().replace(/ /g, '-')}" tvg-country="np" tvg-logo="${ch.logo}" group-title="${name}", ${ch.name}\n`;
      m3u8 += `#KODIPROP:inputstream=inputstream.adaptive\n`;
      m3u8 += `#KODIPROP:inputstream.adaptive.manifest_type=hls\n`;
      m3u8 += `#KODIPROP:http-origin=https://webtv.nettv.com.np\n`;
      m3u8 += `#KODIPROP:http-referrer=https://webtv.nettv.com.np/\n`;
      m3u8 += `#KODIPROP:http-User-Agent=${common_header['User-Agent']}\n`;
      m3u8 += `${workerOrigin}/${hostPrefix}${originalPath.pathname}\n\n`;
    }
  }

  return new Response(m3u8, {
	headers: {
	  'Content-Type': 'text/plain',
	  'Access-Control-Allow-Origin': '*',
	  'Access-Control-Allow-Methods': 'GET',
	  'Access-Control-Allow-Headers': 'Authorization'
	}
  });
}

async function handleProxyStream(req) {
  const url = new URL(req.url);
  const data = await geniusTVtoken.get('Login');
  if (!data) return new Response('Forbidden', { status: 403 });

  try {
    const json = JSON.parse(data);
    const authHeaders = { ...common_header, 'Authorization': `Bearer ${json.access_token}` };

    const wmsRes = await fetch('https://ott-resources.geniustv.geniussystems.com.np/nimble/wmsauthsign', { headers: authHeaders });
    const { wmsauthsign } = await wmsRes.json();

    const parts = url.pathname.split('/');
    const subdomain = parts[1];
    const realPath = parts.slice(2).join('/');
    
    const targetUrl = `https://${subdomain}.nettv.com.np/${realPath}?wmsAuthSign=${wmsauthsign}`;

    return new Response(null, {
      status: 302,
      headers: {
        'Location': targetUrl,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Expose-Headers': 'Location',
        'Referer': 'https://webtv.nettv.com.np/',
        'Origin': 'https://webtv.nettv.com.np'
      }
    });
  } catch (e) {
    return new Response('Stream Issue?', { status: 500 });
  }
}

async function handleGetOtp(request) {
  const mobile = (await request.formData()).get('mobile');
  await fetch('https://ott-auth.geniustv.geniussystems.com.np/subscribers/ncell-login', {
    method: 'POST',
    headers: { ...common_header, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ mobile })
  });
  return new Response(JSON.stringify({ status: "sent" }));
}

async function handleUnifiedLogin(request) {
  const fd = await request.formData();
  const type = fd.get('type');
  let authData;

  try {
    if (type === 'ncell') {
      const mobile = fd.get('mobile'), otp = fd.get('otp');
      const device_id = 'V' + Math.floor(100000 + Math.random() * 900000);
      let res = await fetch('https://ott-auth.geniustv.geniussystems.com.np/subscribers/ncell-login/validate/', {
        method: 'POST',
        headers: { ...common_header, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ device_id, mobile, otp, session_id: '1', type: '' })
      });
      authData = await res.json();

      if (authData.status === 400 && authData.sessions?.[0]?.id) {
        let retry = await fetch('https://ott-auth.geniustv.geniussystems.com.np/subscribers/ncell-login/validate?type=retry', {
          method: 'POST',
          headers: { ...common_header, 'Content-Type': 'application/json' },
          body: JSON.stringify({ account_id: mobile, device_id, login_type: 'ncell', mobile, otp, password: otp, reseller_id: '913', session_id: authData.sessions[0].id.toString(), token: otp, username: mobile })
        });
        authData = await retry.json();
      }
    } else if (type === 'cookie') {
      const raw = fd.get('cookie');
      const ntvU = raw.split('\n').map(l=>l.trim()).filter(l=>l&&!l.startsWith('#')).map(l=>l.split('\t')).find(p=>p[5]==='ntv_u')?.[6];
      authData = JSON.parse(decodeURIComponent(ntvU));
    } else if (type === 'token') {
      authData = JSON.parse(fd.get('tokenJson'));
    }

    if (authData?.access_token) {
      await geniusTVtoken.put('Login', JSON.stringify(authData));
      return new Response(JSON.stringify({ status: "success" }));
    }
    throw new Error("Invalid Auth");
  } catch (e) {
    return new Response(JSON.stringify({ status: "error", message: e.message }), { status: 400 });
  }
}

function renderLoginPage() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>GeniusTV Login</title>
  <style>
    body {
      font-family: -apple-system, system-ui, sans-serif;
      background: #f4f7f6;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
    }
    .card {
      background: #fff;
      padding: 2rem;
      border-radius: 15px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.05);
      width: 100%;
      max-width: 360px;
    }
    .tabs {
      display: flex;
      margin-bottom: 20px;
      gap: 10px;
    }
    .tab {
      flex: 1;
      padding: 8px;
      text-align: center;
      cursor: pointer;
      font-size: 14px;
      border-radius: 6px;
      background: #eee;
      transition: background 0.2s;
    }
    /* Replaced blue with #10a37f */
    .tab.active {
      background: #10a37f;
      color: #fff;
    }
    .panel { display: none; } 
    .panel.active { display: block; }
    
    input, textarea {
      width: 100%;
      padding: 12px;
      margin: 10px 0;
      border: 1px solid #ddd;
      border-radius: 8px;
      box-sizing: border-box;
      outline: none;
      transition: border-color 0.2s;
    }
    /* Emerald focus ring instead of default blue */
    input:focus, textarea:focus {
      border-color: #10a37f;
      box-shadow: 0 0 0 2px rgba(16, 163, 127, 0.1);
    }

    button {
      width: 100%;
      padding: 12px;
      background: #10a37f;
      color: #fff;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: bold;
      transition: opacity 0.2s;
    }
    button:hover {
      opacity: 0.9;
    }
    button:active {
      transform: scale(0.98);
    }

    #msg {
      text-align: center;
      font-size: 13px;
      margin-top: 15px;
      color: #666;
    }
    /* Link style if you add them later */
    a {
      color: #10a37f;
      text-decoration: none;
    }
    .hidden { display: none; }
  </style>
</head>
<body>
  <div class="card">
    <h2 style="text-align:center;margin:0 0 20px 0">GeniusTV Login</h2>
    <div class="tabs">
      <div class="tab active" onclick="switchTab(0)">Ncell</div>
      <div class="tab" onclick="switchTab(1)">Cookie</div>
      <div class="tab" onclick="switchTab(2)">Token</div>
    </div>

    <div class="panel active">
      <input type="tel" id="mobile" placeholder="98/97XXXXXXXX">
      <button id="otpBtn" onclick="sendOtp()">Get OTP</button>
      <div id="otpSection" class="hidden">
        <input type="text" id="otp" placeholder="Enter OTP">
        <button onclick="doLogin({type:'ncell', mobile:getValue('mobile'), otp:getValue('otp')})">Verify & Login</button>
      </div>
    </div>

    <div class="panel">
      <textarea id="cookie" rows="4" placeholder="Paste Cookie..."></textarea>
      <button onclick="doLogin({type:'cookie', cookie:getValue('cookie')})">Login with Cookie</button>
    </div>

    <div class="panel">
      <textarea id="tokenJson" rows="4" placeholder="Paste Token JSON..."></textarea>
      <button onclick="doLogin({type:'token', tokenJson:getValue('tokenJson')})">Login with Token</button>
    </div>

    <div id="msg"></div>
  </div>

  <script>
    const getValue = (id) => document.getElementById(id).value;
    const msg = document.getElementById('msg');

    function switchTab(i) {
      document.querySelectorAll('.tab').forEach((t,idx)=>t.classList.toggle('active', i===idx));
      document.querySelectorAll('.panel').forEach((p,idx)=>p.classList.toggle('active', i===idx));
    }

    async function sendOtp() {
      msg.innerText = "Sending OTP...";
      const res = await fetch('/get-otp', { method:'POST', body:new URLSearchParams({mobile:getValue('mobile')}) });
      if(res.ok) { document.getElementById('otpSection').classList.remove('hidden'); msg.innerText="OTP Sent!"; }
    }

    async function doLogin(payload) {
      msg.innerText = "Authenticating...";
      const res = await fetch('/login', { method:'POST', body:new URLSearchParams(payload) });
      const data = await res.json();
      if(data.status === "success") window.location.href = "/playlist";
      else { msg.innerText = data.message; msg.style.color = "red"; }
    }
  </script>
</body></html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html' } });
}

async function handleRefreshToken() {
  const data = await geniusTVtoken.get('Login');
  if (!data) return new Response('Unauthorized', { status: 302, headers: {'Location': '/login'} });

  const json = JSON.parse(data);
  const jwt = JSON.parse(atob(json.access_token.split('.')[1]));
  const authHeaders = { ...common_header, 'Authorization': `Bearer ${json.access_token}`, 'Content-Type': 'application/json' };

  const sessionRes = await fetch(`https://ott-auth.geniustv.geniussystems.com.np/resellers/${jwt.params.reseller_id}/subscribers/${jwt.sub}/sessions`, { headers: authHeaders });
  const sessionJson = await sessionRes.json();
  const sessionId = sessionJson[0].id;

  const refreshRes = await fetch('https://ott-auth.geniustv.geniussystems.com.np/v2/subscribers/refresh-token', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ 
      "session_id": sessionId, 
      "refresh_token": json.refresh_token 
    })
  });

  const refreshed = await refreshRes.json();

    if (refreshed && refreshed.access_token) {
      await geniusTVtoken.put('Login', JSON.stringify(refreshed));
      return new Response('Session refreshed successfully.\n\nYou can automate this once every 24 hours using https://cron-job.org/', { headers: {'Content-Type': 'text/plain'}});
    } else {
      return new Response('Refresh failed: ' + JSON.stringify(refreshed), { status: 400 });
    }
}

async function handleWmsRequest() {
  const data = await geniusTVtoken.get('Login');
  if (!data) return new Response('Unauthorized', { status: 302, headers: {'Location': '/login'} });

  const json = JSON.parse(data);
  const authHeaders = { ...common_header, 'Authorization': `Bearer ${json.access_token}` };

  const wmsauthsignResponse = await fetch('https://resources.geniustv.geniussystems.com.np/nimble/wmsauthsign', {
    method: 'GET',
    headers: authHeaders
  });

  if (!wmsauthsignResponse.ok) return new Response(JSON.stringify({ error: 'Failed to fetch WMS' }), { status: wmsauthsignResponse.status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });

  const wmsauthsignData = await wmsauthsignResponse.json();

  return new Response(JSON.stringify({ wmsAuthSign: wmsauthsignData.wmsauthsign }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}

async function handleApiRequest() {
  const data = await geniusTVtoken.get('Login');
  if (!data) return new Response('Unauthorized', { status: 302, headers: {'Location': '/login'} });

  const json = JSON.parse(data);
  const jwt = JSON.parse(atob(json.access_token.split('.')[1]));
  const authHeaders = { ...common_header, 'Authorization': `Bearer ${json.access_token}` };

  const res = await fetch(`https://ott-livetv-resources.geniustv.geniussystems.com.np/subscriber/livetv/v1/namespaces/${jwt.params.reseller_id}/subscribers/${jwt.sub}/serial/${jwt.params.serial}`, { headers: authHeaders });
  if (!res.ok) return new Response('Session Expired', { status: 401 });

  const responseBody = await res.json();
  const categories = responseBody.result.categories;
  const categoryChannelMap = responseBody.result.category_channel_map.filter(mapping => mapping.category_id !== 20);
  const sortedCategories = categories.sort((a, b) => a.priority - b.priority);
  let groupedChannels = {};
  const sortedChannels = responseBody.result.channels.sort((a, b) => a.channel_number - b.channel_number);
  sortedChannels.forEach(channel => {
    const channelCategories = categoryChannelMap
      .filter(mapping => mapping.channel_id === channel.id)
      .map(mapping => sortedCategories.find(category => category.id === mapping.category_id)?.category || 'Uncategorized');

    channelCategories.forEach(categoryName => {
      if (!groupedChannels[categoryName]) {
        groupedChannels[categoryName] = [];
      }
      groupedChannels[categoryName].push({
        channel_id: channel.id,
        channel_number: channel.channel_number,
        channel_country: channel.country.toUpperCase(),
        channel_category: categoryName,
        channel_name: channel.name,
        channel_slug: channel.name.toLowerCase().replace(/ /g, '-'),
        channel_logo: channel.logo,
        channel_description: channel.description,
        channel_url: `${channel.channel_urls?.[0]?.path}`,
      });
    });
  });

  const filteredCategories = sortedCategories
    .map(category => {
      const categoryName = category.category;
      const channels = groupedChannels[categoryName] || [];
      if (categoryName !== 'All' && channels.length > 0) {
        return {
          category_id: category.id,
          category_name: category.category,
          category_slug: category.slug,
          category_description: category.description,
          category_logo: category.logo,
          category_priority: category.priority,
          channels: channels,
        };
      }
      return null;
    })
    .filter(category => category !== null);

  const apiResponse = {
    feeds: filteredCategories,
  };

  const newResponse = new Response(JSON.stringify(apiResponse), { 
    status: 200, 
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
  });

  return newResponse;
}
