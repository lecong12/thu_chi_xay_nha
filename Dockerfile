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
COPY nginx.conf /etc/nginx/conf.d/default.conf.template

EXPOSE 80

# Dùng envsubst để thay thế biến $PORT trong file template thành file config thực tế
# Đặt giá trị mặc định cho PORT là 80 nếu không được cung cấp, sau đó chạy Nginx.
# Điều này giúp container chạy ổn định trên cả local và các nền tảng đám mây.
CMD ["/bin/sh", "-c", "export PORT=${PORT:-80} && envsubst '$PORT' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]