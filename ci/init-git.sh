# Install ssh-agent if not already installed, it is required by Docker.
echo "Verifying ssh-agent"
which ssh-agent || ( apt update -y && apt install openssh-client -y )

# Run ssh-agent (inside the build environment)
eval $(ssh-agent -s)
 
# Create the SSH directory and give it the right permissions
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Add the SSH key stored in RUNNER_PRIVATE_KEY variable to the agent store
# We're using tr to fix line endings which makes ed25519 keys work
# without extra base64 encoding.
# https://gitlab.com/gitlab-examples/ssh-private-key/issues/1#note_48526556
echo "Installing RUNNER_PRIVATE_KEY"
echo "$RUNNER_PRIVATE_KEY" | tr -d '\r' > ~/.ssh/id_rsa
chmod 400 ~/.ssh/id_rsa
ssh-add ~/.ssh/id_rsa

# Add entry for github.com since this seems to be buggy
echo "Writing ssh config"
echo "
Host github.com
    HostName github.com
    IdentityFile ~/.ssh/id_rsa
    User git

Host *
    StrictHostKeyChecking no" >> ~/.ssh/config