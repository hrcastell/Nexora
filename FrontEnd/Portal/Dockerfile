# Nexora frontend (Portal) — LOCAL DEVELOPMENT image only.
#
# NOT used in production. Production is a static build (`npm run build`)
# uploaded to Bluehost — no container runtime involved. This image exists
# purely so `docker compose up` gives a working hot-reload Vite dev server.

FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

# --host 0.0.0.0 is required so Vite's dev server is reachable from outside
# the container (default Vite bind is localhost-only, which is invisible
# from the host through Docker's port mapping).
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
