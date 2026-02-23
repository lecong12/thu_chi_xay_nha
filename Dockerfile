# Stage 1: Build the React application
FROM node:18-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm install

# Nhận biến môi trường (Build Args) cho React
# Railway/Render cần cấu hình biến này trong phần Build Settings hoặc Environment Variables
ARG REACT_APP_SHEET_ID
ENV REACT_APP_SHEET_ID=$REACT_APP_SHEET_ID

COPY . .
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:alpine

COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Thay thế cổng 80 bằng cổng $PORT do Railway/Render cung cấp, sau đó chạy Nginx
CMD ["/bin/sh", "-c", "sed -i -e 's/listen 80;/listen '${PORT:-80}';/g' /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]