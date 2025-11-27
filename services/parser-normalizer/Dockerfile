FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache git python3 make g++

COPY package*.json ./
RUN npm install --only=production --no-optional

COPY . .

CMD ["npm", "start"]