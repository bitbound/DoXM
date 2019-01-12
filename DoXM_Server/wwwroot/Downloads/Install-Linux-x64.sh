HostName=
Organization=
GUID=$(cat /proc/sys/kernel/random/uuid)

systemctl stop doxm-client
rm -r -f /usr/local/bin/DoXM
rm -f /etc/systemd/system/doxm-client.service
systemctl daemon-reload

if [ "$1" = "--uninstall" ]; then
	exit
fi

apt-get install unzip

mkdir -p /usr/local/bin/DoXM/
cd /usr/local/bin/DoXM/

if [ "$1" = "--path" ]; then
    echo  "Copying install files..."
	cp $2 /usr/local/bin/DoXM/DoXM-Linux.zip
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

echo Enter the username whose Xauthority file will be used.
echo Note: This user will need to be logged in for the remote control session to work.
echo This value can be changed later in /etc/systemd/system/doxm-client.service.
read -p 'User: ' user

echo Creating service...

cat > /etc/systemd/system/doxm-client.service << EOL
[Unit]
Description=The DoXM service client used for remote access.

[Service]
WorkingDirectory=/usr/local/bin/DoXM/
ExecStart=/usr/local/bin/DoXM/DoXM_Client
Restart=always
RestartSec=10
Environment=DISPLAY=:0
Environment="XAUTHORITY=/home/$user/.Xauthority"

[Install]
WantedBy=graphical.target
EOL

systemctl enable doxm-client
systemctl start doxm-client

echo Install complete.