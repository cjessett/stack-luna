FROM node:16 AS build

WORKDIR /app

COPY . .

RUN yarn global add pm2
RUN yarn install
RUN yarn build

CMD [ "pm2-runtime", "build/server.js" ]

