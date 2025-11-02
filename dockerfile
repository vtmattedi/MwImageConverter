FROM node:latest

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN CI=true npm run build

EXPOSE 4173
CMD ["npx", "vite", "preview", "--host", "0.0.0.0"]