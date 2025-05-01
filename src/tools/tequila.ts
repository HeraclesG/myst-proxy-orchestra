import { ConnectionStatus, Identity, IdentityRegistrationStatus, Proposal, TequilapiClient, TequilapiClientFactory } from 'mysterium-vpn-js';
import { log } from './common';
import axios, { AxiosRequestConfig }  from 'axios';
import {startContract } from '../inter'
export interface QuickConnectOptions {
    proxyPort: number;
    retries: number;
}

export const buildNodeClient = async (port: number) => {
    const client = new NodeClient(port);
    return client
};

export class NodeClient {
    public api: TequilapiClient;
    public identity: string = '';
    public token: string = '';
    public port: number;
    public connectedIdentity: string = '';

    constructor(port: number) {
        this.port = port
        this.api = new TequilapiClientFactory(`http://78.46.80.162:${port}/tequilapi`, 40_000).build();
    }

    public async reconnectToCurrent(proxyPort: number) {
        try {
            // connect to provider
            await this.cancelConnection();
            console.log(`Reconnecting to: ${proxyPort}... (${this.connectedIdentity})`);
            const connectInfo = await this.api.connectionCreate(this.connectionOptions(this.connectedIdentity, proxyPort), 40_000);
            log(`Reconnected to: ${proxyPort}! (${this.connectedIdentity})`);
            return connectInfo.status;
        } catch (err: any) {
            log(`failed to reconnect, error: ${err}`);
            return ConnectionStatus.NOT_CONNECTED;
        }
    }

    public async getProposals(countryCount: number) {
        // Fetch proposals with residential IP type and minimum quality
        
        const proposals = await this.api.findProposals({
            ipType: 'residential', 
            qualityMin: 1.0
        });
    
        // Count proposals by country
        const proposalCountByCountry = proposals.reduce((countMap, proposal) => {
            // Safely access country, default to 'Unknown' if not present
            const country = proposal.location.country || 'Unknown';
            
            // Increment count for the country
            countMap[country] = (countMap[country] || 0) + 1;
            
            return countMap;
        }, {} as Record<string, number>);
    
        // Transform to array of objects for more flexible return
        const proposalAnalysis = Object.entries(proposalCountByCountry).map(([country, count]) => ({
            country,
            count,
            percentage: (count / proposals.length * 100).toFixed(2),
            distCont: Math.round( count / proposals.length * (countryCount))
        }))
        // Sort by count in descending order
        .sort((a, b) => b.count - a.count);
    
        return {
            total: proposals.length,
            countries: proposalAnalysis
        };
    }

    public async quickConnectTo(country: string, { proxyPort, retries }: QuickConnectOptions) {
        await this.cancelConnection();
        
        console.info(`Start Proxy Port ${proxyPort} ${country}=====================`);
        let res = false
        let proposals: Proposal[] = []
        while(!res){
            try {
                proposals = await this.api.findProposals(proposalQuery(country));
                res = true
            } catch (err: any) {
                // log(`Fetch proposal failed`);
                res = false
            }
        }
        // log(`found ${proposals} proposals for ${country}`);
        while(retries > 0){
            const provider = proposals[Math.floor(Math.random() * proposals.length)];
            const { providerId } = provider;
            log(`connecting to ${country}... (proxyPort: ${providerId})`);
            try {
                // connect to provider
                // const currentresult = await this.api.identityCurrent({ passphrase: ''});
                // const idid = currentresult.id
                // const idresult = await this.api.identity(idid);
                // console.log(idresult)
                const connectInfo = await this.api.connectionCreate(this.connectionOptions(providerId, proxyPort), 50_000);
                this.connectedIdentity = providerId
                log(`connected to: ${proxyPort}! (${connectInfo.sessionId})`);
                return connectInfo.status;
            } catch (err: any) {
                retries -= 1;
                console.log(`failed to connect, error: ${err}, retries: ${retries}`);
                if (retries === 0) {
                    return ConnectionStatus.NOT_CONNECTED
                }
            }
        }
        return ConnectionStatus.NOT_CONNECTED;
    }
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    public async onboarding() {
        const authresult = await this.api.authAuthenticate({ username: 'myst', password: 'mystberry' });
        console.log(authresult)
        this.token = authresult.token
        await this.api.termsUpdate({ agreedProvider: true, agreedVersion: '0.0.53' });
        await this.api.authChangePassword({ username: 'myst', oldPassword: 'mystberry', newPassword: 'qwerty123456' });
        const currentresult = await this.api.identityCurrent({ passphrase: ''});
        console.log(currentresult)
        const idid = currentresult.id
        const idresult = await this.api.identity(idid);
        console.log(idresult)
        const txres = await startContract(idresult.channelAddress)
        if (!txres) return false
        // await new Promise(resolve => setTimeout(resolve, 5000));
        await this.api.identityRegister(idid, {beneficiary: '0x81399E92aCF86F5aeD2fc44872eaFb9115a79E68', stake: 0});
        return true
        // const state = await this.getState()
    }
    public async getState() {
        const url = `http://95.217.234.2:${this.port}/tequilapi/events/state`; // Replace with your actual URL
        console.log(url, this.token)
        try {
            const config: AxiosRequestConfig = {
                headers: {
                    'Cookie': `token=${this.token}`
                }
            };
        
            const response = await axios.get(url, config);
    
            console.log('Response data:', response.data);
            return response.data
        } catch (error) {
            console.error('Error occurred:', error);
            return null
        }
    }
    
    public async getTest() {
        const url = `http://136.243.175.139:8080/api/category`; // Replace with your actual URL
        console.log(url, this.token)
        try {
            const config: AxiosRequestConfig = {
                headers: {
                    'Cookie': `token=${this.token}`
                }
            };
        
            const response = await axios.get(url, config);
    
            console.log('Response data:', response.data);
            return response.data
        } catch (error) {
            console.error('Error occurred:', error);
            return null
        }
    }

    public async auth() {
        await this.api.authAuthenticate({ username: 'myst', password: 'qwerty123456' });
        this.identity = await this.unlockFirstIdentity();
        return this;
    }

    // `proxyPort = -1` cancels any active connections
    public async cancelConnection(proxyPort: number = -1) {
        try {
            await this.api.connectionCancel({ proxyPort });
        } catch (ignored: any) {}
    }

    public async info(): Promise<Identity> {
        try {
            return await this.api.identity(this.identity);
        } catch (ignored: any) {
            return EMPTY_IDENTITY;
        }
    }

    private async unlockFirstIdentity() {
        const list = await this.api.identityList();
        const first = list.find(() => true);
        if (!first) {
            throw new Error('no identity present');
        }
        await this.api.identityUnlock(first.id, '');
        return first.id;
    }

    private connectionOptions(providerId: string, proxyPort: number) {
        return {
            serviceType: 'wireguard',
            providerId: providerId,
            consumerId: this.identity,
            connectOptions: { proxyPort: proxyPort },
        };
    }
}

const proposalQuery = (country: string) => ({ locationCountry: country.toUpperCase(), ipType: 'residential', qualityMin: 1.0 });

const EMPTY_IDENTITY = {
    id: '0x',
    hermesId: '0x',
    registrationStatus: IdentityRegistrationStatus.Unknown,
    channelAddress: '0x',
    balance: 0,
    balanceTokens: {
        human: '0',
        wei: '0',
        ether: '0',
    },
    earnings: 0,
    earningsTotal: 0,
    stake: 0,
};