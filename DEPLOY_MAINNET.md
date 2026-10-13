# SOCIONET: deploying to ICP mainnet

This guide is for deploying SOCIONET as a permanent, decentralized app on the
Internet Computer (ICP) mainnet. Sign-in uses Internet Identity at
`https://identity.internetcomputer.org`.

The steps below must be run on **your own machine**. Deploying to mainnet creates
canisters and spends cycles from your wallet, and the build sandbox has no route
to the ICP network.

---

## 1. What you need

- Node.js 20+, `pnpm`, and `mops` (`npm i -g ic-mops`).
- The `icp` CLI (icp-cli). Install it from the official docs at https://docs.icp.build.
  The `icp` command used below is the one `deploy.sh` in this repo already uses.
- An ICP identity with cycles. Check the balance and top up with the `icp` tooling
  in the official docs before deploying.
- A passkey or device for Internet Identity (you will sign in with it in the browser).

---

## 2. Check the backend compiles (recommended, takes a minute)

The sandbox could not run the official Motoko compiler (moc 1.8.2, pinned in `mops.toml`).
Run this on your machine first:

```bash
cd /path/to/mybestproject
mops install
mops build          # compiles the backend with the pinned moc (1.8.2)
```

If `mops build` reports errors, send them to me. The backend was checked here with
an older compiler, which cannot resolve some dot-notation calls on core collections.
Those errors also appear on the original code, so they are compiler-version noise.
The mops build is the authoritative check.

---

## 3. Deploy the backend to mainnet

```bash
cd /path/to/mybestproject
icp deploy -e ic backend
```

Get the backend canister ID and save it in a shell variable:

```bash
export BACKEND_CANISTER_ID=$(icp canister settings show -e ic --id-only backend)
echo "$BACKEND_CANISTER_ID"
```

If `-e ic` is not recognised, run `icp environment list` (or check the icp docs) to see
the mainnet environment name in your icp version.

---

## 4. Claim the admin role (do this right away)

The backend has an admin role that can set the VAPID JWT, credit balances, and
configure Stripe. `initializeAccessControl` grants admin to its caller, so run it before
anyone else does:

```bash
icp canister call -e ic backend initializeAccessControl '()'
icp canister call -e ic backend isCallerAdmin '()'   # should return (true)
```

The first caller to run `initializeAccessControl` becomes admin. The admin is the
icp identity you deployed with, so keep that identity safe.

---

## 5. Deploy the frontend

The frontend build reads `BACKEND_CANISTER_ID` and writes it into `env.json`
(see `src/frontend/canister.yaml`). Export it, then deploy:

```bash
export BACKEND_CANISTER_ID=$(icp canister settings show -e ic --id-only backend)
icp deploy -e ic frontend
icp canister settings show -e ic --id-only frontend   # your frontend canister ID
```

Your app is then at `https://<frontend-canister-id>.icp0.io`.

Frontend settings for mainnet:

- `src/frontend/.env.production` has `VITE_USE_MOCK=false`. That turns off the demo
  identity and the local mock server.
- Internet Identity is `https://identity.internetcomputer.org` (set in `vite.config.js`
  for every non-local build).

---

## 6. Test the deployment

1. Open `https://<frontend-canister-id>.icp0.io` in a browser.
2. Click **Continue with Internet Identity**. Create an identity with a passkey.
   Internet Identity will ask for permission to sign in to the app.
3. Create a profile. It is stored in the backend canister and persists across
   sign-ins and upgrades.
4. To test calls and messages, open the app in a second browser profile with a
   second identity. Send a friend request, accept it, and then message or call.
   Messages and calls only work between accepted friends.

---

## 7. Upgrades (keeping data)

Every later change keeps user data, because the backend uses
`--default-persistent-actors` (see `mops.toml`). Upgrade with the same commands:

```bash
icp deploy -e ic backend
icp deploy -e ic frontend
```

Do not reinstall or delete the canister. That would erase all data.

---

## 8. Known limits (read before going live)

- **Storage gateway.** Video and image files go through the object-storage package,
  which by default uses `https://blob.caffeine.ai`. That is a third-party gateway, not
  a canister. Set `storage_gateway_url` in `env.json` if you run your own gateway.
- **Push notifications.** A Web Push message must be signed with a VAPID JWT that
  expires within 24 hours. Generate it offline with your VAPID private key and load it
  with `setVapidJwt` as admin. Push messages carry no body, because encrypting the
  payload (RFC 8291) is not implemented. The service worker shows a generic
  notification and the app loads the details.
- **Rotate the VAPID key.** The old VAPID private key was committed in source and is
  still in git history. Treat it as public. Generate a new key pair, put the new public
  key in `src/backend/lib/push-notifications.mo`, and load a JWT signed with the new
  private key.
- **Calls use STUN only.** WebRTC connects directly with public STUN servers. Some
  networks (strict NAT, corporate firewalls) need a TURN server, which is not set up.
- **Third-party search.** The Explore page calls a public third-party search endpoint
  (`yt.chocolatemoo53.com`). Replace it or remove it before relying on that page.
- **Likes and comments are stored on-chain, but the UI remembers likes per browser.**
  The backend allows one vote per user per reel, so a reload can show a stale like icon.

---

## 9. What changed in this pass

Backend (`src/backend`):

- Users can no longer set their own balance. `saveCallerUserProfile` keeps the stored
  balance. The new `adminCreditBalance` (admin only) is the only way to add balance.
- Payments can only be failed or cancelled while pending or processing, and the sender is
  refunded exactly once. Before this, a completed payment could be "cancelled" and refunded
  after the recipient was already paid.
- Friend requests cannot overwrite an existing relationship. Accept and reject only work
  on pending requests.
- Messages, chats, and calls require accepted friendship. Message length is limited to 5000
  characters.
- Comment authors come from the caller's profile, not the client. Comments are limited to
  1000 characters.
- Likes and dislikes are one vote per user per reel.
- WebRTC signaling is limited to the two participants of a session. Entries are validated,
  size-capped, and expire after 10 minutes.
- Push subscriptions are private (owner only), and endpoints must be `https://`.
- JSON in push payloads is escaped (it was not before).
- The VAPID private key was removed from source comments.
- Notification IDs use a counter instead of a timestamp.

Frontend (`src/frontend`):

- Production builds use the real backend and Internet Identity. The mock is only used when
  `VITE_USE_MOCK=true` (dev).
- Incoming calls are read from the canister's notifications, so they work across devices.
  Calls are placed with `initiateVideoCall`. The localStorage and WebSocket call path is
  gone.
- TypeScript errors fixed (`vibrate`/`actions` on Notification in `GlobalCallManager.tsx`).
- Bundle is minified (1.9 MB to 1.05 MB).
- Login copy is accurate (no more "no data collection").
- `ProjectBundlePage` no longer claims to produce a ZIP.
- Removed the unused Firebase module and dependency, and a missing `/sounds/namaste.mp3`
  reference.
- Removed an unrelated student PDF (`DEEP.pdf`) and 12 personal screenshots from `public/assets`. Moved them to
  `/home/user/removed-from-repo/public-assets` (outside the repo, not deleted).
- Added `adminCreditBalance` to the generated bindings (`backend.ts`, `backend.d.ts`,
  `declarations/`). Regenerate them with `pnpm bindgen` after the mops build to confirm.

Repo hygiene:

- `socionet_db.json`, `vite_out.txt`, `vite_err.txt`, and `cloudflared.log` are no longer
  tracked and are in `.gitignore`. The files stay on disk.
