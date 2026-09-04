# Signaling server for Jury's Out

A tiny [PeerJS](https://peerjs.com) server. It introduces players to each other
and then gets out of the way — gameplay is peer-to-peer, so this uses almost no
bandwidth and comfortably fits a free tier.

Run it because the **shared public broker rate-limits busy clients**, which is
the most common cause of "Could not open a room."

## Local

```bash
npm install
npm start
```

Then open the game, go to **Settings**, and enter `localhost:9000:/`.

## Deploy free (Render)

1. Push this folder to a GitHub repo (it can be a subfolder of your game repo).
2. On [Render](https://render.com): **New → Web Service**, connect the repo.
3. Set **Root Directory** to `peerserver` if it's a subfolder.
4. Runtime **Node**, Build `npm install`, Start `npm start`. Free instance type.
5. Deploy, then copy the hostname, e.g. `jurys-out-signal.onrender.com`.
6. In the game's **Settings**, enter `jurys-out-signal.onrender.com:443:/`

Verify it's alive:

```bash
curl https://your-app.onrender.com/
```

You should get a small JSON response rather than an error.

**Free-tier caveat:** Render idles a free service after ~15 minutes without
traffic, and the next request waits ~50 seconds while it wakes. Open the URL in
a browser a minute before game night, or use a paid instance.

## Notes

- Must be served over **HTTPS** — the game runs on https and browsers refuse
  insecure WebSockets from a secure page. Render and Fly do this for you.
- `key` here must match the client's. The game uses PeerJS's default `peerjs`,
  so leave it alone unless you change both sides.
- This is signaling only. If two players still can't reach each other after
  connecting to the room, that's NAT traversal and needs TURN — see the main
  README.
