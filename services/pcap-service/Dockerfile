FROM node:18-alpine

# Install tcpdump and wireshark-common (for editcap/mergecap)
RUN apk add --no-cache tcpdump wireshark-common

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

# Create directory for PCAP storage
RUN mkdir -p /var/lib/pcap

EXPOSE 8089

CMD ["npm", "start"]
