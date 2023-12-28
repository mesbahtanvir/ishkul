# Stage 1 - Build the React app
FROM node:14 as build
WORKDIR /ishkul-web
COPY package.json package-lock.json ./
RUN npm install
COPY . ./
RUN npm run build

# Stage 2 - Serve the app with Nginx
FROM nginx:alpine
COPY --from=build /ishkul-web/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
