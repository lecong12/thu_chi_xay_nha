# Stage 1: Build the React application

FROM node:18-alpine as build



WORKDIR /app



COPY package*.json ./

RUN npm install

# Thiết lập biến môi trường từ ARG để React có thể nhận được khi build

ENV REACT_APP_SHEET_ID=$REACT_APP_SHEET_ID

ENV REACT_APP_APPSHEET_APP_ID=$REACT_APP_APPSHEET_APP_ID

ENV REACT_APP_APPSHEET_ACCESS_KEY=$REACT_APP_APPSHEET_ACCESS_KEY

ENV REACT_APP_APPSHEET_TABLE_NAME=$REACT_APP_APPSHEET_TABLE_NAME


COPY . .

RUN npm run build



# Stage 2: Serve the application with Nginx