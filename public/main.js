document.addEventListener('DOMContentLoaded', async function () {
    let provider, signer, account;

    const eclipseWalletElement = document.getElementById("eclipse-wallet");
    const etherAmountElement = document.getElementById('ether-amount');
    const connectButton = document.getElementById('connect-button');
    const bridgeButton = document.getElementById('bridge-button');
    const walletInfo = document.getElementById('wallet-info');
    const walletAddress = document.getElementById('wallet-address');
    const balanceElement = document.getElementById("balance-info");

    async function connectWallet() {
        if (window.ethereum) {
            try {
                await window.ethereum.request({ method: 'eth_requestAccounts' });
                provider = new ethers.providers.Web3Provider(window.ethereum);
                signer = provider.getSigner();
                account = await signer.getAddress();
                console.log("Connected account:", account);
                await checkNetwork();
                displayAccountInfo();
            } catch (error) {
                console.error("Error connecting to wallet:", error);
                alert("An error occurred while connecting to the wallet.");
            }
        } else {
            alert('MetaMask is not installed. Please install it to use this app.');
        }
    }

    async function checkNetwork() {
        const chainId = await provider.send("eth_chainId", []);
        console.log("Current chain ID:", chainId);
        if (chainId !== '0x1') {
            try {
                await provider.send("wallet_switchEthereumChain", [{ chainId: '0x1' }]);
            } catch (error) {
                console.error("Error switching to Ethereum mainnet:", error);
                alert("Please switch to the Ethereum mainnet in MetaMask.");
            }
        }
    }

    async function displayAccountInfo() {
        connectButton.style.display = 'none';
        walletInfo.style.display = 'flex';
        balanceElement.style.display = 'block';

        try {
            const balance = await signer.getBalance();
            walletAddress.textContent = `${account.slice(0, 6)}...${account.slice(-4)}`;
            balanceElement.textContent = `Balance: ${ethers.utils.formatEther(balance).slice(0, 7)} ETH`;
            balanceElement.classList.remove('hidden');
        } catch (error) {
            console.error("Error fetching balance:", error);
        }

        checkFormValidity();
    }

    function checkFormValidity() {
        const eclipseAddr = eclipseWalletElement.value;
        const etherAmount = etherAmountElement.value;
        const isWalletConnected = !!account;
        const isEclipseAddrValid = eclipseAddr.length === 44;
        const isAmountValid = parseFloat(etherAmount) > 0;

        bridgeButton.disabled = !(isWalletConnected && isEclipseAddrValid && isAmountValid);
    }
    
    async function deposit() {
        if (!provider) {
            provider = new ethers.providers.Web3Provider(window.ethereum);
            console.log("Provider set.");
        }
        if (!signer) {
            signer = provider.getSigner();
            console.log("Signer set.");
        }
        if (!account) {
            account = await signer.getAddress();
            console.log("Account set:", account);
        }
    
        try {
            const chainId = await provider.send("eth_chainId", []);
            console.log("Current chain ID:", chainId);
            if (chainId !== '0x1') {
                await provider.send("wallet_switchEthereumChain", [{ chainId: '0x1' }]);
            }
    
            const eclipseAddr = eclipseWalletElement.value;
            const amountInWei = ethers.utils.parseEther(etherAmountElement.value);
            const minimumAmountInWei = ethers.utils.parseEther('0.002');
    
            if (amountInWei.lt(minimumAmountInWei)) {
                alert("The minimum amount to send is 0.002 ETH.");
                return;
            }
    
            console.log("Eclipse addr:", eclipseAddr, "Amount in Wei:", amountInWei);
    
            const contractAddress = "0x83cb71d80078bf670b3efec6ad9e5e6407cd0fd1";
            const contractABI = [
                {
                    "inputs": [
                        { "internalType": "bytes32", "name": "hexSolanaAddress", "type": "bytes32" },
                        { "internalType": "uint256", "name": "amountWei", "type": "uint256" }
                    ],
                    "name": "deposit",
                    "outputs": [],
                    "stateMutability": "payable",
                    "type": "function"
                }
            ];
    
            const contract = new ethers.Contract(contractAddress, contractABI, signer);
            const hexEclipseAddr = ethers.utils.hexlify(ethers.utils.base58.decode(eclipseAddr));
    
            const gasLimit = await contract.estimateGas.deposit(hexEclipseAddr, amountInWei, { value: amountInWei });
            console.log("Estimated Gas Limit:", gasLimit.toString());
    
            const gasPrice = await provider.getGasPrice();
            const higherGasPrice = gasPrice.mul(ethers.BigNumber.from(12)).div(ethers.BigNumber.from(10));
            console.log("Current Gas Price:", gasPrice.toString());
            console.log("Adjusted Gas Price:", higherGasPrice.toString());
    
            const tx = await contract.deposit(hexEclipseAddr, amountInWei, {
                value: amountInWei,
                gasLimit: gasLimit,
                gasPrice: higherGasPrice
            });
    
            console.log("Transaction hash:", tx.hash);
            alert(`Transaction successful! Your transaction hash is ${tx.hash}. You can view it on Etherscan: https://etherscan.io/tx/${tx.hash}`);
        } catch (error) {
            alert("An error occurred during the bridge transaction.");
            console.error("Bridge transaction error", error);
        }
    }    

    connectButton.addEventListener('click', async function (event) {
        event.preventDefault();
        await connectWallet();
    });

    bridgeButton.addEventListener('click', async function (event) {
        event.preventDefault();
        await deposit();
    });

    eclipseWalletElement.addEventListener('input', checkFormValidity);
    etherAmountElement.addEventListener('input', checkFormValidity);

    if (window.ethereum) {
        window.ethereum.on('accountsChanged', async () => {
            location.reload();
        });
    }
});