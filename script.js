// Configuration (no private key here!)
const FAUCET_CONFIG = {
    amount: 0.005, // MEGA tokens per claim
    cooldownHours: 24,
    rpcUrl: 'https://carrot.megaeth.com/rpc',
    explorerUrl: 'https://megaexplorer.xyz',
    faucetWalletAddress: '0x57D1A43199D80da4e56BAb0683838c7a536e2530'  // For balance check only
};

let userWallet = '';
let tasksCompleted = false;

function isValidEthereumAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}

function getLastClaimTime(address) {
    const claims = JSON.parse(localStorage.getItem('faucetClaims') || '{}');
    return claims[address.toLowerCase()] || 0;
}

function setLastClaimTime(address) {
    const claims = JSON.parse(localStorage.getItem('faucetClaims') || '{}');
    claims[address.toLowerCase()] = Date.now();
    localStorage.setItem('faucetClaims', JSON.stringify(claims));
}

function canClaim(address) {
    const lastClaim = getLastClaimTime(address);
    const cooldownMs = FAUCET_CONFIG.cooldownHours * 60 * 60 * 1000;
    return Date.now() - lastClaim >= cooldownMs;
}

function getTimeUntilNextClaim(address) {
    const lastClaim = getLastClaimTime(address);
    const cooldownMs = FAUCET_CONFIG.cooldownHours * 60 * 60 * 1000;
    const nextClaimTime = lastClaim + cooldownMs;
    return Math.max(0, nextClaimTime - Date.now());
}

function startCountdown(address) {
    const countdownTimer = document.getElementById('countdownTimer');
    const countdownDisplay = document.getElementById('countdownDisplay');
    const claimBtn = document.getElementById('claimBtn');
    const completedBtn = document.getElementById('completedBtn');

    function updateCountdown() {
        const timeLeft = getTimeUntilNextClaim(address);

        if (timeLeft <= 0) {
            countdownTimer.style.display = 'none';
            claimBtn.style.display = 'block';
            completedBtn.style.display = 'none';
            tasksCompleted = false;
            return;
        }

        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

        countdownDisplay.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        setTimeout(updateCountdown, 1000);
    }

    countdownTimer.style.display = 'block';
    claimBtn.style.display = 'none';
    completedBtn.style.display = 'none';
    updateCountdown();
}

function showSuccess(message) {
    const successMsg = document.getElementById('successMessage');
    successMsg.innerHTML = message;
    successMsg.style.display = 'block';
    setTimeout(() => {
        successMsg.style.display = 'none';
    }, 8000);
}

function showError(message) {
    const errorMsg = document.getElementById('errorMessage');
    errorMsg.textContent = message;
    errorMsg.style.display = 'block';
    setTimeout(() => {
        errorMsg.style.display = 'none';
    }, 5000);
}

function showTaskModal() {
    document.getElementById('taskModal').style.display = 'flex';
}

function closeTaskModal() {
    document.getElementById('taskModal').style.display = 'none';
}

function completeAllTasks() {
    closeTaskModal();
    tasksCompleted = true;

    document.getElementById('claimBtn').style.display = 'none';
    document.getElementById('completedBtn').style.display = 'block';

    setTimeout(() => {
        sendTokensAutomatically();
    }, 1000);
}

async function checkFaucetBalance() {
    try {
        const response = await fetch(FAUCET_CONFIG.rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_getBalance',
                params: [FAUCET_CONFIG.faucetWalletAddress, 'latest'],
                id: 1
            })
        });

        const data = await response.json();
        const balanceWei = parseInt(data.result || '0x0', 16);
        return balanceWei / 1e18;
    } catch (error) {
        console.error('Error checking balance:', error);
        return 0;
    }
}

  async function sendTokensAutomatically() {
    const completedBtn = document.getElementById('completedBtn');
    completedBtn.disabled = true;
    completedBtn.textContent = 'Sending tokens...';

    try {
        const response = await fetch('/api/sendtoken', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ toAddress: userWallet })
        });

        if (!response.ok) {
            // Try to read error message as text for debugging
            const errorText = await response.text();
            throw new Error(`Server error ${response.status}: ${errorText}`);
        }

        const result = await response.json();

        if (result.success) {
            setLastClaimTime(userWallet);
            showSuccess(`
                🎉 <strong>Congratulations!</strong><br>
                ${result.amount} MEGA tokens sent successfully!<br>
                <small>Transaction: ${result.txHash.substring(0, 20)}...</small><br>
                <a href="${FAUCET_CONFIG.explorerUrl}/tx/${result.txHash}" target="_blank" style="color: #4CAF50;">View on Explorer →</a>
            `);

            document.getElementById('walletAddress').value = '';
            tasksCompleted = false;
            startCountdown(userWallet);
        } else {
            showError(`Failed to send tokens: ${result.error || 'Unknown error'}`);
            document.getElementById('claimBtn').style.display = 'block';
            document.getElementById('completedBtn').style.display = 'none';
            tasksCompleted = false;
        }
    } catch (error) {
        showError(`Error: ${error.message}`);
        document.getElementById('claimBtn').style.display = 'block';
        document.getElementById('completedBtn').style.display = 'none';
        tasksCompleted = false;
    } finally {
        completedBtn.textContent = 'Completed';
        completedBtn.disabled = false;
    }
}


document.addEventListener('DOMContentLoaded', () => {
    const walletInput = document.getElementById('walletAddress');
    const claimBtn = document.getElementById('claimBtn');
    const completedBtn = document.getElementById('completedBtn');

    document.getElementById('faucetAmount').textContent = FAUCET_CONFIG.amount;

    claimBtn.textContent = `Claim ${FAUCET_CONFIG.amount} MEGA Tokens`;

    walletInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') claimBtn.click();
    });

    walletInput.addEventListener('input', () => {
        document.getElementById('successMessage').style.display = 'none';
        document.getElementById('errorMessage').style.display = 'none';
    });

    claimBtn.addEventListener('click', () => {
        const address = walletInput.value.trim();

        if (!address) {
            showError('Please enter a wallet address');
            return;
        }

        if (!isValidEthereumAddress(address)) {
            showError('Please enter a valid Ethereum address');
            return;
        }

        if (!canClaim(address)) {
            showError('This wallet has already claimed in the last 24 hours');
            startCountdown(address);
            return;
        }

        userWallet = address;
        showTaskModal();
    });

    document.getElementById('taskModal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeTaskModal();
    });

    console.log('MegaETH Faucet initialized');
});
