read -p "Enter app root path: " appRoot
read -p "Enter app host (e.g. example.com): " appHost



# Install .NET Core.
sudo curl -sSL https://dot.net/v1/dotnet-install.sh | bash /dev/stdin



# Install Nginx
sudo -s
nginx=stable
add-apt-repository ppa:nginx/$nginx
apt-get update
apt-get install nginx

sudo service nginx start


# Configure Nginx
read -r -d '' nginxConfig << EOF
server {
    listen        80;
    server_name   $appHost *.$appHost;
    location / {
        proxy_pass         http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade \$http_upgrade;
        proxy_set_header   Connection keep-alive;
        proxy_set_header   Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
    }
}
EOF
$nginxConfig > /etc/nginx/sites-available/default

# Test config.
sudo nginx -t

# Reload.
sudo nginx -s reload




# Create service.

read -r -d '' serviceConfig << EOF
[Unit]
Description=DoXM Server

[Service]
WorkingDirectory=$appRoot
ExecStart=/usr/bin/dotnet $appRoot/doxm_server.dll
Restart=always
# Restart service after 10 seconds if the dotnet service crashes:
RestartSec=10
SyslogIdentifier=doxm
User=www-data
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=DOTNET_PRINT_TELEMETRY_MESSAGE=false

[Install]
WantedBy=multi-user.target
EOF
echo $serviceConfig > /etc/systemd/system/doxm.service


# Enable service.
systemctl enable doxm.service
# Start service.
systemctl start doxm.service
# Check service status
systemctl status doxm.service


# Install Certbot and get SSL cert.
sudo apt-get update
sudo apt-get install software-properties-common
sudo add-apt-repository ppa:certbot/certbot
sudo apt-get update
sudo apt-get install python-certbot-nginx 

sudo certbot --nginx
