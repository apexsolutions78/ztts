# Deployment

1. Create the MySQL database and user in DirectAdmin.
2. Clone the repository on the server.
3. Run `npm ci --omit=dev`.
4. Create `.env` from `.env.example` with production secrets.
5. Apply migrations with the hosting MySQL client.
6. Configure the domain reverse proxy to `127.0.0.1:3000`.
7. Start with `pm2 start src/server/app.js --name tripportal`.
8. Enable HTTPS and configure DB/storage backups.
