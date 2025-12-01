FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Dashboard API runs on 8081 by default
EXPOSE 8081

CMD ["npm", "start"]