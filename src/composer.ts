import fs from 'fs/promises';

async function createDockerComposeFile(startNumber: number, numNodes: number): Promise<void> {
  if (numNodes < 1 || numNodes > 1000) {
    console.error("Number of nodes must be between 1 and 1000.");
    return;
  }

  let composeFile = `version: '3.0'
services:`;

  for (let i = startNumber; i < startNumber + numNodes; i++) {
    const nodeName = `c${i.toString().padStart(4, '0')}-node`;
    const volumneName = `c${i.toString().padStart(4, '0')}`;
    const uiPort = 20000 + i;
    const proxyPort = 10000 + i;

    composeFile += `
  ${nodeName}:
    image: mysteriumnetwork/myst:latest
    ports:
      - ${uiPort}:${uiPort}
      - ${proxyPort}:${proxyPort}
    cap_add:
      - NET_ADMIN
    command: '--ui.port=${uiPort} --proxymode daemon'
    volumes:
      - ./myst-node-${volumneName}:/var/lib/mysterium-node`;
  }

  composeFile += `
  fleet-10:
    image: tianon/true
    restart: 'no'
    depends_on:`;

  for (let i = startNumber; i < startNumber + numNodes; i++) {
    const nodeName = `c${i.toString().padStart(4, '0')}-node`;
    composeFile += `
      - ${nodeName}`;
  }

  composeFile += `
`;

  try {
    await fs.writeFile('docker-compose.yml', composeFile);
    console.log('Docker Compose file created successfully.');
  } catch (err) {
    console.error('Error writing file:', err);
  }
}


// Example usage (remember to adjust numNodes):
const numNodesToCreate = 1; // Example, change as needed
const startNumber = 1001
createDockerComposeFile(startNumber, numNodesToCreate)
  .catch(error => {
    console.error("An error occurred:", error);
  });
