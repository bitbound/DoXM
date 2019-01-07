HostName=
Organization=
GUID=$(cat /proc/sys/kernel/random/uuid)

systemctl stop doxm-client
rm -r -f /usr/local/bin/DoXM
rm -f /etc/systemd/system/doxm-client.service

if [ "$1" = "--uninstall" ]; then
	exit
fi

apt-get install unzip

mkdir -p /usr/local/bin/DoXM/
cd /usr/local/bin/DoXM/

if [ "$1" = "--path" ]; then
    echo  "Copying install files..."
	cp $2 /usr/local/bin/DoXM/DoXM-Linux.zip
	exit
else
    echo  "Downloading client..."
	wget $HostName/Downloads/DoXM-Linux.zip
fi

unzip ./DoXM-Linux.zip
chmod +x ./DoXM_Client

cat > ./ConnectionInfo.json << EOL
{
	"MachineID":"$GUID", 
	"Host":"$HostName",
	"OrganizationID": "$Organization",
	"ServerVerificationToken":""
}
EOL

echo Creating service...

cat > /etc/systemd/system/doxm-client.service << EOL
[Unit]
Description=The DoXM service client used for remote access.

[Service]
WorkingDirectory=/usr/local/bin/DoXM/
ExecStart=/usr/local/bin/DoXM/DoXM_Client
Restart=always
# Restart service after 10 seconds if the dotnet service crashes:
RestartSec=10
KillSignal=SIGINT
SyslogIdentifier=doxm-client

[Install]
WantedBy=multi-user.target
EOL

systemctl enable doxm-client.service
systemctl start doxm-client.service

echo Install complete.