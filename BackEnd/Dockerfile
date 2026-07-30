# Nexora backend — LOCAL DEVELOPMENT image only.
#
# NOT used in production. Production runs on Bluehost shared hosting via
# cPanel "Setup Node.js App" (no Docker there at all). This image exists
# purely so `docker compose up` gives a working hot-reload backend locally.

FROM node:20-alpine

WORKDIR /usr/src/app

# Installed here so the image is immediately runnable; docker-compose.yml
# bind-mounts the real source over this at runtime for hot reload, with an
# anonymous volume protecting this install from being shadowed.
COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
