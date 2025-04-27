# Step 1: Build the React app
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Step 2: Serve the build with nginx
FROM nginx:stable-alpine

# Copy build output to nginx directory
COPY --from=builder /app/build /usr/share/nginx/html

# (Optional) If you have custom nginx settings, copy it
# COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
