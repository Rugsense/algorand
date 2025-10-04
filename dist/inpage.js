"use strict";
var InpageBundle = (() => {
  // src/inpage.ts
  (() => {
    if (window.__RUGSENSE_INPAGE_LOADED) {
      console.log("[Rugsense/inpage] Already loaded, skipping");
      return;
    }
    window.__RUGSENSE_INPAGE_LOADED = true;
    console.log("[Rugsense/inpage] init", location.href);
    function getExtensionURL(path) {
      const scripts = document.querySelectorAll('script[src*="inpage.js"]');
      if (scripts.length > 0) {
        const scriptSrc = scripts[0].src;
        const match = scriptSrc.match(/chrome-extension:\/\/([^\/]+)/);
        if (match) {
          return `chrome-extension://${match[1]}/${path}`;
        }
      }
      return path;
    }
    let trackedAddresses = [];
    let recentTransactions = [];
    const verificationCache = /* @__PURE__ */ new Map();
    const pendingRequests = /* @__PURE__ */ new Set();
    const securityAnalysisCache = /* @__PURE__ */ new Map();
    const lastAIRequest = /* @__PURE__ */ new Map();
    const analyzedContracts = /* @__PURE__ */ new Set();
    const rewardHistory = [];
    async function performAISecurityAnalysis(sourceCode, contractAddress) {
      try {
        console.log(
          `[Rugsense/inpage] Starting AI security analysis for ${contractAddress}`
        );
        const analysis = getPatternBasedAnalysis(sourceCode);
        const aiInsights = await simulateAIAnalysis(sourceCode, analysis);
        return {
          ...analysis,
          aiInsights,
          contractAddress,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        };
      } catch (error) {
        console.error(`[Rugsense/inpage] AI Analysis Error:`, error);
        return {
          riskLevel: "UNKNOWN",
          issues: ["AI analysis failed"],
          summary: "AI analysis could not be completed",
          recommendations: ["Manual review recommended"],
          aiInsights: null,
          contractAddress,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        };
      }
    }
    async function simulateAIAnalysis(sourceCode, patternAnalysis) {
      const insights = [];
      const solidityVersion = sourceCode.match(/pragma solidity\s+([^;]+);/);
      if (solidityVersion) {
        insights.push(`Solidity Version: ${solidityVersion[1]}`);
      }
      const functions = sourceCode.match(/function\s+\w+\s*\([^)]*\)/g);
      if (functions) {
        insights.push(`Total Functions: ${functions.length}`);
      }
      const modifiers = sourceCode.match(/modifier\s+\w+\s*\([^)]*\)/g);
      if (modifiers) {
        insights.push(`Total Modifiers: ${modifiers.length}`);
      }
      const events = sourceCode.match(/event\s+\w+\s*\([^)]*\)/g);
      if (events) {
        insights.push(`Total Events: ${events.length}`);
      }
      const imports = sourceCode.match(/import\s+[^;]+;/g);
      if (imports) {
        insights.push(`Total Imports: ${imports.length}`);
      }
      return {
        insights,
        complexity: sourceCode.length > 1e4 ? "High" : sourceCode.length > 5e3 ? "Medium" : "Low",
        estimatedGasUsage: "Medium",
        securityScore: patternAnalysis.riskLevel === "LOW" ? 85 : patternAnalysis.riskLevel === "MEDIUM" ? 65 : 35
      };
    }
    function displaySecurityAnalysis(analysis, contractAddress, contractName) {
      console.log(`[Rugsense/inpage] ===== SECURITY ANALYSIS RESULT =====`);
      console.log(
        `[Rugsense/inpage] Contract: ${contractName} (${contractAddress})`
      );
      console.log(`[Rugsense/inpage] Risk Level: ${analysis.riskLevel}`);
      console.log(
        `[Rugsense/inpage] Security Score: ${analysis.aiInsights?.securityScore || "N/A"}`
      );
      console.log(
        `[Rugsense/inpage] Complexity: ${analysis.aiInsights?.complexity || "N/A"}`
      );
      console.log(`[Rugsense/inpage] Issues Found: ${analysis.issues.length}`);
      if (analysis.issues.length > 0) {
        console.log(`[Rugsense/inpage] Issues:`);
        analysis.issues.forEach((issue, index) => {
          console.log(`[Rugsense/inpage] ${index + 1}. ${issue}`);
        });
      }
      if (analysis.recommendations && analysis.recommendations.length > 0) {
        console.log(`[Rugsense/inpage] Recommendations:`);
        analysis.recommendations.forEach((rec, index) => {
          console.log(`[Rugsense/inpage] ${index + 1}. ${rec}`);
        });
      }
      if (analysis.aiInsights?.insights) {
        console.log(`[Rugsense/inpage] AI Insights:`);
        analysis.aiInsights.insights.forEach((insight, index) => {
          console.log(`[Rugsense/inpage] ${index + 1}. ${insight}`);
        });
      }
      console.log(`[Rugsense/inpage] ===== END SECURITY ANALYSIS =====`);
    }
    async function logContractSourceCode(contractAddress) {
      try {
        console.log(
          `[Rugsense/inpage] Fetching source code for contract: ${contractAddress}`
        );
        let apiUrl = "";
        let network = "unknown";
        if (window.ethereum) {
          try {
            const chainId = await window.ethereum.request({
              method: "eth_chainId"
            });
            const chainIdNum = parseInt(chainId, 16);
            switch (chainIdNum) {
              case 1:
                apiUrl = "https://api.etherscan.io/api";
                network = "mainnet";
                break;
              case 11155111:
                apiUrl = "https://api-sepolia.etherscan.io/api";
                network = "sepolia";
                break;
              case 5:
                apiUrl = "https://api-goerli.etherscan.io/api";
                network = "goerli";
                break;
              case 137:
                apiUrl = "https://api.polygonscan.com/api";
                network = "polygon";
                break;
              case 56:
                apiUrl = "https://api.bscscan.com/api";
                network = "bsc";
                break;
              default:
                apiUrl = "https://api-sepolia.etherscan.io/api";
                network = "sepolia";
            }
          } catch (e) {
            apiUrl = "https://api-sepolia.etherscan.io/api";
            network = "sepolia";
          }
        } else {
          apiUrl = "https://api-sepolia.etherscan.io/api";
          network = "sepolia";
        }
        const response = await fetch(
          `${apiUrl}?module=contract&action=getsourcecode&address=${contractAddress}&apikey=UAPHPG82Y8VXRRF8XKQPXBTEFJCHGR5VUD`
        );
        if (!response.ok) {
          console.log(
            `[Rugsense/inpage] Failed to fetch source code: HTTP ${response.status}`
          );
          return;
        }
        const data = await response.json();
        console.log(`[Rugsense/inpage] API Response for ${contractAddress}:`, {
          status: data.status,
          message: data.message,
          resultLength: data.result ? data.result.length : 0,
          hasResult: !!data.result,
          firstResult: data.result && data.result[0] ? data.result[0] : null
        });
        if (data.status === "1" && data.result && data.result[0]) {
          const contractInfo = data.result[0];
          const sourceCode = contractInfo.SourceCode || "";
          const abi = contractInfo.ABI || "";
          console.log(`[Rugsense/inpage] Contract Info:`, {
            contractName: contractInfo.ContractName,
            compilerVersion: contractInfo.CompilerVersion,
            sourceCodeLength: sourceCode.length,
            abiLength: abi.length,
            sourceCodePreview: sourceCode.substring(0, 100),
            isSourceCodeEmpty: sourceCode === "",
            isSourceCodeNull: sourceCode === null,
            isSourceCodeUndefined: sourceCode === void 0
          });
          let isVerified = false;
          let actualSourceCode = "";
          if (sourceCode && typeof sourceCode === "string") {
            if (sourceCode.trim() !== "" && sourceCode !== "null" && sourceCode !== "undefined" && sourceCode !== "Contract source code not verified") {
              if (sourceCode.length > 10) {
                isVerified = true;
                actualSourceCode = sourceCode;
              }
              if (sourceCode.startsWith("{")) {
                try {
                  const parsed = JSON.parse(sourceCode);
                  if (parsed.sources && Object.keys(parsed.sources).length > 0) {
                    isVerified = true;
                    actualSourceCode = sourceCode;
                  }
                } catch (e) {
                  if (sourceCode.length > 10) {
                    isVerified = true;
                    actualSourceCode = sourceCode;
                  }
                }
              }
            }
          }
          if (!isVerified && abi && abi !== "" && abi !== "Contract source code not verified") {
            console.log(
              `[Rugsense/inpage] Source code not found, but ABI available. Contract might be verified.`
            );
            if (sourceCode && sourceCode.length > 0) {
              isVerified = true;
              actualSourceCode = sourceCode;
            }
          }
          if (isVerified && actualSourceCode) {
            console.log(
              `[Rugsense/inpage] ===== SOURCE CODE FOR ${contractAddress} (${network.toUpperCase()}) =====`
            );
            console.log(
              `[Rugsense/inpage] Contract Name: ${contractInfo.ContractName || "Unknown"}`
            );
            console.log(
              `[Rugsense/inpage] Compiler Version: ${contractInfo.CompilerVersion || "Unknown"}`
            );
            console.log(
              `[Rugsense/inpage] Source Code Length: ${actualSourceCode.length} characters`
            );
            console.log(`[Rugsense/inpage] ===== SOURCE CODE START =====`);
            console.log(actualSourceCode);
            console.log(`[Rugsense/inpage] ===== SOURCE CODE END =====`);
            console.log(`[Rugsense/inpage] ===== AI SECURITY ANALYSIS =====`);
            try {
              const aiAnalysis = await performAISecurityAnalysis(
                actualSourceCode,
                contractAddress
              );
              console.log(`[Rugsense/inpage] AI Analysis Result:`, aiAnalysis);
              displaySecurityAnalysis(
                aiAnalysis,
                contractAddress,
                contractInfo.ContractName || "Unknown"
              );
              checkAndRewardFirstAnalysis(
                contractAddress,
                contractInfo.ContractName || "Unknown"
              );
            } catch (error) {
              console.error(`[Rugsense/inpage] AI Analysis Error:`, error);
            }
          } else {
            console.log(
              `[Rugsense/inpage] No source code available for contract: ${contractAddress}`
            );
            console.log(
              `[Rugsense/inpage] Contract is not verified on ${network.toUpperCase()}`
            );
            console.log(`[Rugsense/inpage] Source code details:`, {
              sourceCode,
              length: sourceCode.length,
              isEmpty: sourceCode === "",
              isNull: sourceCode === null,
              isUndefined: sourceCode === void 0
            });
          }
        } else {
          console.log(
            `[Rugsense/inpage] API Error for contract ${contractAddress}:`,
            {
              status: data.status,
              message: data.message,
              result: data.result
            }
          );
        }
      } catch (error) {
        console.error(
          `[Rugsense/inpage] Error fetching source code for ${contractAddress}:`,
          error
        );
      }
    }
    let lastAIRequestTime = 0;
    const AI_REQUEST_COOLDOWN = 3e4;
    let consecutiveFailures = 0;
    const MAX_CONSECUTIVE_FAILURES = 3;
    function isValidEthereumAddress(address) {
      if (address.length !== 42) {
        return false;
      }
      if (!address.startsWith("0x")) {
        return false;
      }
      const hexRegex = /^0x[a-fA-F0-9]{40}$/;
      return hexRegex.test(address);
    }
    function saveWalletAddress(address) {
      try {
        localStorage.setItem("rugsense-wallet-address", address);
        console.log("[Rugsense] Wallet address saved:", address);
      } catch (error) {
        console.error("[Rugsense] Error saving wallet address:", error);
      }
    }
    function loadWalletAddress() {
      try {
        return localStorage.getItem("rugsense-wallet-address");
      } catch (error) {
        console.error("[Rugsense] Error loading wallet address:", error);
        return null;
      }
    }
    function clearWalletAddress() {
      try {
        localStorage.removeItem("rugsense-wallet-address");
        console.log("[Rugsense] Wallet address cleared");
        trackedAddresses = [];
        console.log("[Rugsense] Tracked addresses array cleared");
        updateTrackedAddresses();
        const managementPage = document.getElementById(
          "rugsense-management-page"
        );
        if (managementPage) {
          const list = document.getElementById("rugsense-management-list");
          if (list) {
            if (trackedAddresses.length === 0) {
              list.innerHTML = '<div style="color: #9ca3af; text-align: center; padding: 20px;">No addresses tracked yet</div>';
            } else {
              list.innerHTML = trackedAddresses.map(
                (addr) => `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #1f2937; border-radius: 6px; margin-bottom: 8px;">
                <span style="font-family: monospace; color: #e5e5e5; font-size: 12px;">${addr}</span>
                <button class="rugsense-remove-address-btn" data-address="${addr}" style="background: #ef4444; color: white; border: none; border-radius: 4px; padding: 6px 12px; cursor: pointer; font-size: 12px;">Remove</button>
              </div>
            `
              ).join("");
              const removeButtons = list.querySelectorAll(
                ".rugsense-remove-address-btn"
              );
              removeButtons.forEach((button) => {
                button.addEventListener("click", (e) => {
                  e.preventDefault();
                  const address = button.getAttribute("data-address");
                  console.log(
                    "[Rugsense] Remove button clicked for address:",
                    address
                  );
                  if (address) {
                    removeAddress(address);
                  }
                });
              });
            }
          }
        }
      } catch (error) {
        console.error("[Rugsense] Error clearing wallet address:", error);
      }
    }
    function showWalletConnected(address) {
      console.log("[Rugsense] Wallet connected:", address);
    }
    function showWalletNotFound() {
      console.log("[Rugsense] Algorand wallet not found");
    }
    window.toggleRugsenseDropdown = () => {
      const dropdown = document.getElementById("rugsense-dropdown");
      if (dropdown) {
        const isVisible = dropdown.classList.contains("rugsense-visible");
        if (isVisible) {
          dropdown.classList.remove("rugsense-visible");
          dropdown.style.display = "none";
          console.log("[Rugsense/inpage] Dropdown hidden");
        } else {
          dropdown.classList.add("rugsense-visible");
          dropdown.style.display = "block";
          console.log("[Rugsense/inpage] Dropdown shown");
        }
      } else {
        console.log("[Rugsense/inpage] Dropdown not found, creating...");
        createDropdownUI();
      }
    };
    function initDropdown() {
      if (document.head && document.body) {
        createDropdownUI();
      } else {
        setTimeout(initDropdown, 50);
      }
    }
    initDropdown();
    const ALGORAND_TX_TYPES = {
      PAYMENT: "payment",
      ASSET_TRANSFER: "axfer",
      ASSET_FREEZE: "afrz",
      ASSET_CONFIG: "acfg",
      APPLICATION_CALL: "appl",
      KEY_REGISTRATION: "keyreg"
    };
    const HOOKED = /* @__PURE__ */ new WeakSet();
    const ORIGINALS = /* @__PURE__ */ new WeakMap();
    const LAST_SIG = /* @__PURE__ */ new WeakMap();
    async function getTrackedAddresses() {
      return new Promise((resolve) => {
        try {
          window.postMessage(
            { target: "RugsenseContent", type: "Rugsense/GetAddresses" },
            "*"
          );
          const handleResponse = (event) => {
            if (event.source !== window) return;
            const data = event.data;
            if (data && data.target === "RugsenseInpage" && data.type === "Rugsense/AddressesResponse") {
              trackedAddresses = (data.addresses || []).map(
                (addr) => addr.toLowerCase()
              );
              console.log(
                "[Rugsense/inpage] Tracked addresses loaded:",
                trackedAddresses
              );
              window.removeEventListener("message", handleResponse);
              updateTrackedAddresses();
              resolve(trackedAddresses);
            }
          };
          window.addEventListener("message", handleResponse);
          setTimeout(() => {
            window.removeEventListener("message", handleResponse);
            resolve([]);
          }, 1e3);
        } catch (e) {
          console.error("[Rugsense/inpage] Get addresses error:", e);
          resolve([]);
        }
      });
    }
    async function checkContractVerification(contractAddress) {
      try {
        const cacheKey2 = contractAddress.toLowerCase();
        const cached = verificationCache.get(cacheKey2);
        if (cached && Date.now() - cached.timestamp < 3e5) {
          console.log(
            `[Rugsense/inpage] Using cached verification for ${contractAddress}`
          );
          return cached.result;
        }
        if (pendingRequests.has(cacheKey2)) {
          console.log(
            `[Rugsense/inpage] Request already pending for ${contractAddress}, waiting...`
          );
          return new Promise((resolve) => {
            const checkPending = () => {
              if (!pendingRequests.has(cacheKey2)) {
                const cached2 = verificationCache.get(cacheKey2);
                if (cached2) {
                  resolve(cached2.result);
                } else {
                  resolve({ isVerified: false, network: "unknown" });
                }
              } else {
                setTimeout(checkPending, 100);
              }
            };
            checkPending();
          });
        }
        pendingRequests.add(cacheKey2);
        console.log(
          `[Rugsense/inpage] Starting verification check for ${contractAddress}`
        );
        let apiUrl = "";
        let network = "unknown";
        if (window.ethereum) {
          try {
            const chainId = await window.ethereum.request({
              method: "eth_chainId"
            });
            const chainIdNum = parseInt(chainId, 16);
            switch (chainIdNum) {
              case 1:
                apiUrl = "https://api-sepolia.etherscan.io/api";
                network = "sepolia";
                break;
              case 11155111:
                apiUrl = "https://api-sepolia.etherscan.io/api";
                network = "sepolia";
                break;
              case 5:
                apiUrl = "https://api-goerli.etherscan.io/api";
                network = "goerli";
                break;
              case 137:
                apiUrl = "https://api.polygonscan.com/api";
                network = "polygon";
                break;
              case 56:
                apiUrl = "https://api.bscscan.com/api";
                network = "bsc";
                break;
              default:
                apiUrl = "https://api-sepolia.etherscan.io/api";
                network = "sepolia";
            }
          } catch (e) {
            apiUrl = "https://api-sepolia.etherscan.io/api";
            network = "sepolia";
          }
        } else {
          apiUrl = "https://api-sepolia.etherscan.io/api";
          network = "sepolia";
        }
        console.log(
          `[Rugsense/inpage] Checking contract verification on ${network}:`,
          contractAddress
        );
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1e4);
        try {
          const response = await fetch(
            `${apiUrl}?module=contract&action=getsourcecode&address=${contractAddress}&apikey=UAPHPG82Y8VXRRF8XKQPXBTEFJCHGR5VUD`,
            { signal: controller.signal }
          );
          clearTimeout(timeoutId);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          const data = await response.json();
          if (data.status !== "1") {
            throw new Error(`API Error: ${data.message || "Unknown error"}`);
          }
          if (data.status === "1" && data.result && data.result[0]) {
            const contractInfo = data.result[0];
            let isVerified = false;
            let sourceCode = contractInfo.SourceCode || "";
            if (sourceCode && sourceCode !== "") {
              if (sourceCode.length > 10) {
                isVerified = true;
              }
              if (sourceCode.startsWith("{")) {
                try {
                  const parsed = JSON.parse(sourceCode);
                  if (parsed.sources && Object.keys(parsed.sources).length > 0) {
                    isVerified = true;
                  }
                } catch (e) {
                  isVerified = sourceCode.length > 10;
                }
              }
            }
            console.log(`[Rugsense/inpage] Source code check:`, {
              hasSourceCode: !!sourceCode,
              sourceCodeLength: sourceCode.length,
              sourceCodePreview: sourceCode.substring(0, 100),
              isVerified
            });
            if (sourceCode && sourceCode.length > 0) {
              console.log(
                `[Rugsense/inpage] ===== SOURCE CODE FOR ${contractAddress} =====`
              );
              console.log(sourceCode);
              console.log(`[Rugsense/inpage] ===== END SOURCE CODE =====`);
              console.log(
                `[Rugsense/inpage] AI analysis will be performed only for tracked address transactions`
              );
            }
            const result = {
              isVerified,
              contractName: contractInfo.ContractName || "Unknown",
              compilerVersion: contractInfo.CompilerVersion || "Unknown",
              sourceCode,
              abi: contractInfo.ABI || "",
              network
            };
            console.log(
              `[Rugsense/inpage] Contract verification result:`,
              result
            );
            verificationCache.set(cacheKey2, {
              result,
              timestamp: Date.now()
            });
            pendingRequests.delete(cacheKey2);
            return result;
          }
          const fallbackResult = {
            isVerified: false,
            network
          };
          verificationCache.set(cacheKey2, {
            result: fallbackResult,
            timestamp: Date.now()
          });
          pendingRequests.delete(cacheKey2);
          return fallbackResult;
        } catch (fetchError) {
          clearTimeout(timeoutId);
          console.error("[Rugsense/inpage] API fetch error:", fetchError);
          const errorResult = {
            isVerified: false,
            network
          };
          verificationCache.set(cacheKey2, {
            result: errorResult,
            timestamp: Date.now()
          });
          pendingRequests.delete(cacheKey2);
          return errorResult;
        }
      } catch (e) {
        console.error("[Rugsense/inpage] Contract verification check error:", e);
        const errorResult = {
          isVerified: false,
          network: "unknown"
        };
        pendingRequests.delete(cacheKey);
        return errorResult;
      }
    }
    function getPatternBasedAnalysis(sourceCode) {
      let riskLevel = "LOW";
      const issues = [];
      const recommendations = [];
      const code = sourceCode.toLowerCase();
      if (code.includes("selfdestruct(") || code.includes("suicide(")) {
        issues.push("Self-destruct function detected - CRITICAL risk");
        riskLevel = "CRITICAL";
        recommendations.push("Avoid self-destruct unless absolutely necessary");
      }
      if (code.includes("delegatecall(")) {
        issues.push("Delegatecall detected - HIGH risk of proxy attacks");
        riskLevel = "HIGH";
        recommendations.push("Validate delegatecall targets carefully");
      }
      if (code.includes("call(") && !code.includes("require(")) {
        issues.push("Unchecked external calls detected - HIGH reentrancy risk");
        riskLevel = "HIGH";
        recommendations.push("Implement reentrancy guards");
      }
      if (code.includes("tx.origin")) {
        issues.push("tx.origin usage detected - MEDIUM phishing risk");
        if (riskLevel === "LOW") riskLevel = "MEDIUM";
        recommendations.push("Use msg.sender instead of tx.origin");
      }
      if (code.includes("assembly")) {
        issues.push("Assembly code detected - MEDIUM risk");
        if (riskLevel === "LOW") riskLevel = "MEDIUM";
        recommendations.push("Review assembly code thoroughly");
      }
      if (code.includes("block.timestamp")) {
        issues.push("Block timestamp usage - potential manipulation risk");
        if (riskLevel === "LOW") riskLevel = "MEDIUM";
        recommendations.push("Be cautious with block.timestamp dependencies");
      }
      if (code.includes("transfer(") && !code.includes("require(")) {
        issues.push("Unchecked transfer calls detected");
        if (riskLevel === "LOW") riskLevel = "MEDIUM";
        recommendations.push("Check transfer return values");
      }
      if (code.includes("mint(") && code.includes("onlyowner")) {
        issues.push("Mint function with owner control - potential scam risk");
        if (riskLevel === "LOW") riskLevel = "MEDIUM";
        recommendations.push("Verify mint function access controls");
      }
      if (code.includes("withdraw(") && !code.includes("onlyowner")) {
        issues.push("Public withdraw function - HIGH scam risk");
        riskLevel = "HIGH";
        recommendations.push("Verify withdraw function access controls");
      }
      if (code.includes("approve(") && code.includes("unlimited")) {
        issues.push("Unlimited approval detected - HIGH scam risk");
        riskLevel = "HIGH";
        recommendations.push("Avoid unlimited token approvals");
      }
      if (recommendations.length === 0) {
        recommendations.push("Review contract source code manually");
        recommendations.push("Check for recent security audits");
        recommendations.push("Verify contract functionality");
        recommendations.push("Start with small test amounts");
      }
      return {
        riskLevel,
        issues: issues.length > 0 ? issues : ["No obvious security patterns detected"],
        summary: `Pattern-based security analysis completed. Risk level: ${riskLevel}. ${issues.length} potential issues found.`,
        recommendations
      };
    }
    async function analyzeContractSecurity(contractAddress, sourceCode) {
      try {
        const cacheKey2 = `security_${contractAddress.toLowerCase()}`;
        const cached = securityAnalysisCache.get(cacheKey2);
        if (cached && Date.now() - cached.timestamp < 72e5) {
          console.log(
            `[Rugsense/inpage] Using cached security analysis for ${contractAddress}`
          );
          return cached.result;
        }
        if (!sourceCode || sourceCode.trim() === "") {
          console.log(
            `[Rugsense/inpage] No source code available for ${contractAddress}, running basic analysis`
          );
          const basicAnalysis = {
            riskLevel: "MEDIUM",
            issues: [
              "Contract source code not available",
              "Unable to perform detailed security analysis"
            ],
            summary: "Contract is unverified - source code not available for analysis",
            recommendations: [
              "Verify contract source code on Etherscan",
              "Review contract bytecode manually",
              "Start with small test amounts",
              "Check contract on multiple block explorers"
            ]
          };
          securityAnalysisCache.set(cacheKey2, {
            result: basicAnalysis,
            timestamp: Date.now()
          });
          return basicAnalysis;
        }
        const now = Date.now();
        if (now - lastAIRequestTime < AI_REQUEST_COOLDOWN) {
          console.log(
            `[Rugsense/inpage] Rate limit: Too many AI requests, using fallback analysis`
          );
          return {
            riskLevel: "MEDIUM",
            issues: ["AI analysis rate limited - manual review recommended"],
            summary: "Rate limited: Unable to perform AI analysis. Manual code review recommended.",
            recommendations: [
              "Review contract source code manually",
              "Check for known security patterns",
              "Verify contract functionality",
              "Start with small test amounts"
            ]
          };
        }
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          console.log(
            `[Rugsense/inpage] Too many consecutive failures (${consecutiveFailures}), using fallback analysis`
          );
          return {
            riskLevel: "MEDIUM",
            issues: ["AI analysis temporarily disabled due to failures"],
            summary: "AI analysis disabled: Multiple consecutive failures detected.",
            recommendations: [
              "Review contract source code manually",
              "Check for known security patterns",
              "Verify contract functionality",
              "Start with small test amounts"
            ]
          };
        }
        lastAIRequestTime = now;
        console.log(
          `[Rugsense/inpage] Starting AI security analysis for ${contractAddress}`
        );
        const analysisPrompt = `
Analyze this Solidity smart contract for security vulnerabilities and risks. Provide a JSON response with the following structure:

{
  "riskLevel": "LOW|MEDIUM|HIGH|CRITICAL",
  "issues": ["list of specific security issues found"],
  "summary": "brief summary of the contract's security status",
  "recommendations": ["list of security recommendations"]
}

Focus on:
- Reentrancy attacks
- Integer overflow/underflow
- Access control issues
- External calls
- Gas limit issues
- Front-running vulnerabilities
- Logic errors
- Unchecked external calls

Contract Source Code:
${sourceCode.substring(0, 4e3)} // Limit to 4000 chars for API
`;
        console.log(
          `[Rugsense/inpage] Using pattern-based analysis for ${contractAddress}`
        );
        const analysisResult = getPatternBasedAnalysis(sourceCode);
        securityAnalysisCache.set(cacheKey2, {
          result: analysisResult,
          timestamp: Date.now()
        });
        return analysisResult;
      } catch (error) {
        console.error(`[Rugsense/inpage] Pattern-based analysis error:`, error);
        const analysisResult = getPatternBasedAnalysis(sourceCode);
        return analysisResult;
      }
    }
    function short(a) {
      return a ? a.slice(0, 6) + "\u2026" + a.slice(-4) : "unknown";
    }
    function post(type, payload) {
      const packet = {
        target: "RugsenseInpage",
        type,
        payload,
        address: payload?.address
      };
      console.log("[Rugsense/inpage] post:", type, payload);
      try {
        window.postMessage(packet, "*");
      } catch (e) {
        console.error("[Rugsense/inpage] postMessage error:", e);
      }
      try {
        document.dispatchEvent(
          new CustomEvent("RugsenseInpageEvent", { detail: packet })
        );
      } catch (e) {
        console.error("[Rugsense/inpage] CustomEvent error:", e);
      }
    }
    function hookProvider(provider, label = "unknown") {
      if (!provider || typeof provider.request !== "function") {
        console.log(`[Rugsense/inpage] Skipping ${label}: not a valid provider`);
        return;
      }
      const sig = provider.request.toString();
      if (HOOKED.has(provider) && LAST_SIG.get(provider) === sig) {
        return;
      }
      console.log(`[Rugsense/inpage] Hooking provider: ${label}`, provider);
      const orig = provider.request.bind(provider);
      ORIGINALS.set(provider, orig);
      const proxy = new Proxy(orig, {
        apply: async (target, thisArg, argArray) => {
          const args = argArray?.[0] || {};
          try {
            let post3 = function(type, payload) {
              const packet = {
                target: "RugsenseInpage",
                type,
                payload,
                address: payload?.address
              };
              console.log("[Rugsense/inpage] post:", type, payload);
              window.postMessage(packet, "*");
              try {
                document.dispatchEvent(
                  new CustomEvent("RugsenseInpageEvent", { detail: packet })
                );
              } catch {
              }
            }, short3 = function(a) {
              return a ? a.slice(0, 6) + "\u2026" + a.slice(-4) : "unknown";
            };
            var post2 = post3, short2 = short3;
            if (args?.method === "eth_sendTransaction" && Array.isArray(args.params) && args.params[0]) {
              const tx = args.params[0] || {};
              const to = tx.to;
              const from = tx.from;
              const data = tx.data ? String(tx.data) : void 0;
              const selector = data ? data.slice(0, 10) : void 0;
              const value = tx.value;
              const gas = tx.gas;
              console.log(
                "[Rugsense/inpage] eth_sendTransaction detected via",
                label,
                {
                  to,
                  from,
                  selector,
                  hasData: !!data,
                  value: value ? String(value) : void 0,
                  gas: gas ? String(gas) : void 0
                }
              );
              if (to && to.startsWith("0x") && to.length === 42) {
                logContractSourceCode(to);
              }
              const fromLower = from?.toLowerCase();
              const toLower = to?.toLowerCase();
              const isTrackedFrom = fromLower && trackedAddresses.includes(fromLower);
              const isTrackedTo = toLower && trackedAddresses.includes(toLower);
              if (isTrackedFrom || isTrackedTo) {
                console.log(
                  "[Rugsense/inpage] TRACKED ADDRESS TRANSACTION DETECTED!",
                  {
                    from: fromLower,
                    to: toLower,
                    isTrackedFrom,
                    isTrackedTo,
                    trackedAddresses
                  }
                );
                setTimeout(() => {
                  const dropdown = document.getElementById("rugsense-dropdown");
                  if (dropdown) {
                    dropdown.classList.add("rugsense-visible");
                    dropdown.style.display = "block";
                    dropdown.style.border = "3px solid #ef4444";
                    dropdown.style.animation = "pulse 1s ease-in-out 3";
                    dropdown.style.zIndex = "999999999";
                    const alertSection = document.getElementById(
                      "rugsense-alert-section"
                    );
                    const alertDetails = document.getElementById(
                      "rugsense-alert-details"
                    );
                    if (alertSection && alertDetails) {
                      alertSection.style.display = "block";
                      let alertTxType = "Contract Call";
                      if (data) {
                        try {
                          const txData = JSON.parse(data);
                          if (txData.type) {
                            switch (txData.type) {
                              case ALGORAND_TX_TYPES.PAYMENT:
                                alertTxType = "ALGO Payment";
                                break;
                              case ALGORAND_TX_TYPES.ASSET_TRANSFER:
                                alertTxType = "Asset Transfer";
                                break;
                              case ALGORAND_TX_TYPES.ASSET_FREEZE:
                                alertTxType = "Asset Freeze";
                                break;
                              case ALGORAND_TX_TYPES.ASSET_CONFIG:
                                alertTxType = "Asset Configuration";
                                break;
                              case ALGORAND_TX_TYPES.APPLICATION_CALL:
                                alertTxType = "Smart Contract Call";
                                break;
                              case ALGORAND_TX_TYPES.KEY_REGISTRATION:
                                alertTxType = "Key Registration";
                                break;
                              default:
                                alertTxType = "Ethereum Transaction";
                            }
                          }
                        } catch (e) {
                          alertTxType = "Ethereum Transaction";
                        }
                      } else if (!to) {
                        alertTxType = "Smart Contract Deployment";
                      } else if (!data) {
                        alertTxType = "ALGO Transfer";
                      }
                      let methodDetails = "";
                      if (data) {
                        try {
                          const txData = JSON.parse(data);
                          if (txData.type) {
                            switch (txData.type) {
                              case ALGORAND_TX_TYPES.PAYMENT:
                                methodDetails = `Payment: ${txData.amount || "Unknown amount"} microALGO`;
                                break;
                              case ALGORAND_TX_TYPES.ASSET_TRANSFER:
                                methodDetails = `Asset Transfer: Asset ID ${txData.assetId || "Unknown"}`;
                                break;
                              case ALGORAND_TX_TYPES.ASSET_FREEZE:
                                methodDetails = `Asset Freeze: Asset ID ${txData.assetId || "Unknown"}`;
                                break;
                              case ALGORAND_TX_TYPES.ASSET_CONFIG:
                                methodDetails = `Asset Configuration: Asset ID ${txData.assetId || "Unknown"}`;
                                break;
                              case ALGORAND_TX_TYPES.APPLICATION_CALL:
                                methodDetails = `Smart Contract Call: App ID ${txData.appId || "Unknown"}`;
                                break;
                              case ALGORAND_TX_TYPES.KEY_REGISTRATION:
                                methodDetails = "Key Registration for consensus participation";
                                break;
                              default:
                                methodDetails = `Ethereum Transaction: ${txData.type}`;
                            }
                          } else {
                            methodDetails = "Ethereum Transaction";
                          }
                        } catch (e) {
                          methodDetails = "Ethereum Transaction";
                        }
                      }
                      let verificationInfo = "";
                      if (to && data) {
                        checkContractVerification(to).then(
                          (verificationResult) => {
                            const contractStatus = verificationResult.isVerified ? `<span style="display: inline-flex; align-items: center; gap: 4px; color: #10b981;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                  <path d="M9 12l2 2 4-4"></path>
                                </svg>
                                Verified (${verificationResult.contractName || "Unknown"})
                              </span>` : `<span style="display: inline-flex; align-items: center; gap: 4px; color: #ef4444;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                  <path d="M18 6L6 18"></path>
                                  <path d="M6 6l12 12"></path>
                                </svg>
                                UNVERIFIED - Source code not available
                              </span>`;
                            const networkInfo = verificationResult.network ? ` | Network: ${verificationResult.network}` : "";
                            if (verificationResult.isVerified && verificationResult.sourceCode && (isTrackedFrom || isTrackedTo)) {
                              console.log(
                                `[Rugsense/inpage] Running AI analysis for tracked address transaction`
                              );
                              analyzeContractSecurity(
                                to,
                                verificationResult.sourceCode
                              ).then((securityResult) => {
                                const riskColor = securityResult.riskLevel === "CRITICAL" ? "#ef4444" : securityResult.riskLevel === "HIGH" ? "#f97316" : securityResult.riskLevel === "MEDIUM" ? "#eab308" : "#22c55e";
                                const alertDetailsEl = document.getElementById(
                                  "rugsense-alert-details"
                                );
                                if (alertDetailsEl) {
                                  alertDetailsEl.innerHTML = `
                                <div style="margin-bottom: 8px;"><strong>Direction:</strong> ${isTrackedFrom ? "FROM" : "TO"} tracked address</div>
                                <div style="margin-bottom: 8px;"><strong>Tracked Address:</strong> <span style="word-break: break-all; font-family: monospace; font-size: 12px;">${fromLower || toLower}</span></div>
                                <div style="margin-bottom: 8px;"><strong>Contract Address:</strong> <span style="word-break: break-all; font-family: monospace; font-size: 12px;">${to || "N/A"}</span></div>
                                <div style="margin-bottom: 8px;"><strong>Transaction Type:</strong> ${alertTxType}</div>
                                ${methodDetails ? `<div style="margin-bottom: 8px;"><strong>Method:</strong> ${methodDetails}</div>` : ""}
                                <div style="margin-bottom: 8px;"><strong>Contract Status:</strong> <span style="color: #e5e7eb;">${contractStatus}${networkInfo}</span></div>
                                <div style="margin-bottom: 8px;"><strong>Security Risk:</strong> <span style="color: ${riskColor}; font-weight: bold;">${securityResult.riskLevel}</span></div>
                                <div style="margin-bottom: 8px;"><strong>Time:</strong> ${(/* @__PURE__ */ new Date()).toLocaleTimeString()}</div>
                                <div style="margin-top: 10px; padding: 8px; background: rgba(255,255,255,0.1); border-radius: 6px; font-size: 12px;">
                                  <strong>Warning:</strong> This transaction involves a tracked address. Please review carefully before proceeding.
                                  ${!verificationResult.isVerified ? '<br><div style="background: #ef4444; color: white; padding: 8px; border-radius: 6px; margin: 8px 0; font-weight: bold; text-align: center;">\u26A0\uFE0F UNVERIFIED CONTRACT \u26A0\uFE0F<br><small>Source code not available - proceed with extreme caution!</small></div>' : ""}
                                  ${securityResult.riskLevel === "CRITICAL" || securityResult.riskLevel === "HIGH" ? `<br><strong>HIGH RISK CONTRACT:</strong> ${securityResult.summary}` : ""}
                                </div>
                                <div style="margin-top: 8px; padding: 8px; background: rgba(0,0,0,0.2); border-radius: 6px; font-size: 11px;">
                                  <strong>Security Issues:</strong><br>
                                  ${securityResult.issues.slice(0, 2).map(
                                    (issue) => `\u2022 ${issue.length > 50 ? issue.substring(0, 50) + "..." : issue}`
                                  ).join("<br>")}
                                  ${securityResult.issues.length > 2 ? `<br>\u2022 ... and ${securityResult.issues.length - 2} more` : ""}
                                </div>
                              `;
                                }
                              });
                            } else {
                              const alertDetailsEl = document.getElementById(
                                "rugsense-alert-details"
                              );
                              if (alertDetailsEl) {
                                alertDetailsEl.innerHTML = `
                              <div style="margin-bottom: 8px;"><strong>Direction:</strong> ${isTrackedFrom ? "FROM" : "TO"} tracked address</div>
                              <div style="margin-bottom: 8px;"><strong>Tracked Address:</strong> <span style="word-break: break-all; font-family: monospace; font-size: 12px;">${fromLower || toLower}</span></div>
                              <div style="margin-bottom: 8px;"><strong>Contract Address:</strong> <span style="word-break: break-all; font-family: monospace; font-size: 12px;">${to || "N/A"}</span></div>
                              <div style="margin-bottom: 8px;"><strong>Transaction Type:</strong> ${alertTxType}</div>
                              ${methodDetails ? `<div style="margin-bottom: 8px;"><strong>Method:</strong> ${methodDetails}</div>` : ""}
                              <div style="margin-bottom: 8px;"><strong>Contract Status:</strong> <span style="color: #e5e7eb;">${contractStatus}${networkInfo}</span></div>
                              <div style="margin-bottom: 8px;"><strong> Time:</strong> ${(/* @__PURE__ */ new Date()).toLocaleTimeString()}</div>
                              <div style="margin-top: 10px; padding: 8px; background: rgba(255,255,255,0.1); border-radius: 6px; font-size: 12px;">
                                <strong>Warning:</strong> This transaction involves a tracked address. Please review carefully before proceeding.
                                ${!verificationResult.isVerified ? '<br><div style="background: #ef4444; color: white; padding: 8px; border-radius: 6px; margin: 8px 0; font-weight: bold; text-align: center;">\u26A0\uFE0F UNVERIFIED CONTRACT \u26A0\uFE0F<br><small>Source code not available - proceed with extreme caution!</small></div>' : ""}
                              </div>
                            `;
                              }
                            }
                          }
                        );
                      }
                      alertDetails.innerHTML = `
                      <div style="margin-bottom: 8px;"><strong>Direction:</strong> ${isTrackedFrom ? "FROM" : "TO"} tracked address</div>
                      <div style="margin-bottom: 8px;"><strong>Tracked Address:</strong> <span style="word-break: break-all; font-family: monospace; font-size: 12px;">${fromLower || toLower}</span></div>
                      <div style="margin-bottom: 8px;"><strong>Contract Address:</strong> <span style="word-break: break-all; font-family: monospace; font-size: 12px;">${to || "N/A"}</span></div>
                      <div style="margin-bottom: 8px;"><strong>Transaction Type:</strong> ${alertTxType}</div>
                      ${methodDetails ? `<div style="margin-bottom: 8px;"><strong>Method:</strong> ${methodDetails}</div>` : ""}
                      <div style="margin-bottom: 8px;"><strong>Contract Status:</strong> <span id="contract-status-${to}" style="color: #e5e7eb;">Checking verification...</span></div>
                      <div style="margin-bottom: 8px;"><strong>Time:</strong> ${(/* @__PURE__ */ new Date()).toLocaleTimeString()}</div>
                      <div style="margin-top: 10px; padding: 8px; background: rgba(255,255,255,0.1); border-radius: 6px; font-size: 12px;">
                        <strong>Warning:</strong> This transaction involves a tracked address. Please review carefully before proceeding.
                      </div>
                    `;
                    }
                    const timeoutId = setTimeout(() => {
                      const statusElement = document.getElementById(
                        `contract-status-${to}`
                      );
                      if (statusElement) {
                        statusElement.innerHTML = '<span style="color: #f59e0b;">\u23F1\uFE0F Verification timeout - using fallback</span>';
                      }
                    }, 5e3);
                    if (to && data) {
                      checkContractVerification(to).then((verificationResult) => {
                        clearTimeout(timeoutId);
                        const statusElement = document.getElementById(
                          `contract-status-${to}`
                        );
                        if (statusElement) {
                          const contractStatus = verificationResult.isVerified ? `<span style="display: inline-flex; align-items: center; gap: 4px; color: #10b981;">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M9 12l2 2 4-4"></path>
                              </svg>
                              Verified (${verificationResult.contractName || "Unknown"})
                            </span>` : `<span style="display: inline-flex; align-items: center; gap: 4px; color: #ef4444;">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M18 6L6 18"></path>
                                <path d="M6 6l12 12"></path>
                              </svg>
                              UNVERIFIED - Source code not available
                            </span>`;
                          statusElement.innerHTML = contractStatus;
                        }
                      }).catch((error) => {
                        clearTimeout(timeoutId);
                        const statusElement = document.getElementById(
                          `contract-status-${to}`
                        );
                        if (statusElement) {
                          statusElement.innerHTML = '<span style="color: #ef4444;">\u274C Verification failed</span>';
                        }
                      });
                    }
                    setTimeout(() => {
                      dropdown.style.border = "2px solid #9cd2ec";
                      dropdown.style.animation = "";
                    }, 3e3);
                    console.log(
                      "[Rugsense/inpage] Auto-opened dropdown for tracked address transaction"
                    );
                  }
                }, 100);
                post3("Rugsense/ApproveDetected", {
                  title: "TRACKED ADDRESS TRANSACTION",
                  body: `${isTrackedFrom ? "FROM" : "TO"} tracked address: ${fromLower || toLower}`
                });
              }
              const txHash = `${from}-${to}-${data}-${Date.now()}`;
              if (!to && data) {
                const tx2 = {
                  id: txHash,
                  type: "Contract Deployment",
                  address: from || "Unknown",
                  timestamp: Date.now(),
                  details: {
                    bytecodeLength: data.length,
                    gas: args?.params?.[0]?.gas
                  }
                };
                addRecentTransaction(tx2);
              } else if (to && !data) {
                const tx2 = {
                  id: txHash,
                  type: "ETH Transfer",
                  address: to,
                  timestamp: Date.now(),
                  details: {
                    value: args?.params?.[0]?.value
                  }
                };
                addRecentTransaction(tx2);
              } else if (to && data) {
                const methodSig = data.substring(0, 10);
                let txType = "Contract Call";
                console.log("[Rugsense/inpage] Contract call detected:", {
                  to,
                  data,
                  methodSig,
                  from
                });
                try {
                  const txData = JSON.parse(data);
                  if (txData.type) {
                    switch (txData.type) {
                      case ALGORAND_TX_TYPES.PAYMENT:
                        txType = "ALGO Payment";
                        console.log("[Rugsense/inpage] ALGO Payment detected");
                        break;
                      case ALGORAND_TX_TYPES.ASSET_TRANSFER:
                        txType = "Asset Transfer";
                        console.log("[Rugsense/inpage] Asset Transfer detected");
                        break;
                      case ALGORAND_TX_TYPES.ASSET_FREEZE:
                        txType = "Asset Freeze";
                        console.log("[Rugsense/inpage] Asset Freeze detected");
                        break;
                      case ALGORAND_TX_TYPES.ASSET_CONFIG:
                        txType = "Asset Configuration";
                        console.log(
                          "[Rugsense/inpage] Asset Configuration detected"
                        );
                        break;
                      case ALGORAND_TX_TYPES.APPLICATION_CALL:
                        txType = "Smart Contract Call";
                        console.log(
                          "[Rugsense/inpage] Smart Contract Call detected"
                        );
                        break;
                      case ALGORAND_TX_TYPES.KEY_REGISTRATION:
                        txType = "Key Registration";
                        console.log(
                          "[Rugsense/inpage] Key Registration detected"
                        );
                        break;
                      default:
                        txType = "Ethereum Transaction";
                        console.log(
                          "[Rugsense/inpage] Ethereum Transaction detected"
                        );
                    }
                  } else {
                    txType = "Ethereum Transaction";
                    console.log(
                      "[Rugsense/inpage] Ethereum Transaction detected"
                    );
                  }
                } catch (e) {
                  txType = "Ethereum Transaction";
                  console.log("[Rugsense/inpage] Ethereum Transaction detected");
                }
                checkContractVerification(to).then((verificationResult) => {
                  if (isTrackedFrom || isTrackedTo) {
                    if (verificationResult.isVerified && verificationResult.sourceCode) {
                      console.log(
                        `[Rugsense/inpage] Running full analysis for verified contract in tracked address transaction`
                      );
                    } else {
                      console.log(
                        `[Rugsense/inpage] Running basic analysis for unverified contract in tracked address transaction`
                      );
                    }
                    analyzeContractSecurity(
                      to,
                      verificationResult.sourceCode
                    ).then((securityResult) => {
                      const tx2 = {
                        id: txHash,
                        type: txType,
                        address: to,
                        timestamp: Date.now(),
                        details: {
                          method: methodSig,
                          verified: verificationResult.isVerified,
                          contractName: verificationResult.contractName,
                          compilerVersion: verificationResult.compilerVersion,
                          network: verificationResult.network,
                          securityRisk: securityResult.riskLevel,
                          securityIssues: securityResult.issues,
                          from
                        }
                      };
                      addRecentTransaction(tx2);
                    });
                  } else {
                    const tx2 = {
                      id: txHash,
                      type: txType,
                      address: to,
                      timestamp: Date.now(),
                      details: {
                        method: methodSig,
                        verified: verificationResult.isVerified,
                        contractName: verificationResult.contractName,
                        compilerVersion: verificationResult.compilerVersion,
                        network: verificationResult.network,
                        from
                      }
                    };
                    addRecentTransaction(tx2);
                  }
                });
              } else {
              }
              return await target.apply(thisArg, argArray);
            }
            if (args?.method === "eth_requestAccounts") {
              console.log("[Rugsense/inpage] eth_requestAccounts via", label);
              const res = await target.apply(thisArg, argArray);
              const addr = Array.isArray(res) ? res[0] : void 0;
              if (addr) post3("Rugsense/TrackAddress", { address: addr });
              return res;
            }
            if (args?.method === "eth_sendRawTransaction") {
              console.log("[Rugsense/inpage] eth_sendRawTransaction via", label);
              post3("Rugsense/ApproveDetected", {
                title: "Raw Transaction",
                body: "Raw transaction being sent - review carefully"
              });
              return await target.apply(thisArg, argArray);
            }
            if (args?.method === "eth_signTransaction") {
              console.log("[Rugsense/inpage] eth_signTransaction via", label);
              post3("Rugsense/ApproveDetected", {
                title: "Transaction Signing",
                body: "Transaction is being signed - review details"
              });
              return await target.apply(thisArg, argArray);
            }
            if ((args?.method || "").startsWith("eth_signTypedData") || args?.method === "personal_sign") {
              console.log(
                "[Rugsense/inpage] signature method:",
                args.method,
                "via",
                label
              );
              post3("Rugsense/ApproveDetected", {
                title: "Signature Request",
                body: "Review the message before signing"
              });
              return await target.apply(thisArg, argArray);
            }
            return await target.apply(thisArg, argArray);
          } catch (e) {
            console.error("[Rugsense/inpage] error", e);
            throw e;
          }
        }
      });
      try {
        Object.defineProperty(provider, "request", { value: proxy });
        console.log(
          "[Rugsense/inpage] provider.request proxied (defineProperty) \u2014",
          label
        );
      } catch {
        provider.request = proxy;
        console.log(
          "[Rugsense/inpage] provider.request proxied (assign) \u2014",
          label
        );
      }
      HOOKED.add(provider);
      LAST_SIG.set(provider, proxy.toString());
    }
    function scanAndHookAll() {
      const w = window;
      if (w.ethereum) {
        hookProvider(w.ethereum, "window.ethereum");
        if (Array.isArray(w.ethereum.providers)) {
          for (const p of w.ethereum.providers) {
            hookProvider(p, "ethereum.providers[]");
          }
        }
      }
      if (w.remix) {
        console.log("[Rugsense/inpage] Remix detected, scanning for providers");
        const remixProviders = [
          w.remix.ethereum,
          w.remix.provider,
          w.remix.web3?.currentProvider,
          w.remix.web3?.eth?.currentProvider
        ].filter(Boolean);
        remixProviders.forEach((provider, i) => {
          hookProvider(provider, `remix.provider[${i}]`);
        });
      }
      if (location.hostname.includes("remix.ethereum.org") || location.hostname.includes("remix-project.org")) {
        console.log(
          "[Rugsense/inpage] Remix IDE detected, setting up specific hooks"
        );
        const remixElements = [
          "remix-app",
          "remix-ide",
          "remix-ui",
          "tx-runner",
          "tx-execution"
        ];
        remixElements.forEach((selector) => {
          const elements = document.querySelectorAll(selector);
          elements.forEach((element, i) => {
            console.log(
              `[Rugsense/inpage] Found Remix element: ${selector}[${i}]`
            );
            element.addEventListener("click", (e) => {
              console.log(
                `[Rugsense/inpage] Remix element clicked: ${selector}`,
                e.target
              );
              post("Rugsense/ApproveDetected", {
                title: "Remix Transaction",
                body: `Transaction triggered via ${selector}`
              });
            });
          });
        });
      }
      if (w.web3?.currentProvider) {
        hookProvider(w.web3.currentProvider, "web3.currentProvider");
      }
      const commonProviders = [
        "ethereum",
        "web3",
        "provider",
        "wallet",
        "metamask"
      ];
      commonProviders.forEach((name) => {
        if (w[name] && typeof w[name].request === "function") {
          hookProvider(w[name], `window.${name}`);
        }
      });
    }
    scanAndHookAll();
    getTrackedAddresses();
    function createDropdownUI() {
      const existingDropdown = document.getElementById("rugsense-dropdown");
      if (existingDropdown) {
        existingDropdown.remove();
      }
      const dropdown = document.createElement("div");
      dropdown.id = "rugsense-dropdown";
      dropdown.classList.add("rugsense-dropdown-wrapper");
      const container = document.createElement("div");
      container.className = "rugsense-container";
      const header = document.createElement("div");
      header.className = "rugsense-header";
      const logoWrapper = document.createElement("div");
      logoWrapper.className = "rugsense-logo-wrapper";
      const logoImg = document.createElement("img");
      logoImg.src = getExtensionURL("icons/logo.png");
      logoImg.className = "rugsense-logo";
      logoImg.alt = "Rugsense Logo";
      const brand = document.createElement("div");
      brand.className = "rugsense-brand";
      const title = document.createElement("span");
      title.className = "rugsense-title";
      title.textContent = "Rugsense";
      const subtitle = document.createElement("span");
      subtitle.className = "rugsense-subtitle";
      subtitle.textContent = "AI Wallet Assistant";
      brand.appendChild(title);
      brand.appendChild(subtitle);
      logoWrapper.appendChild(logoImg);
      logoWrapper.appendChild(brand);
      const closeBtn = document.createElement("button");
      closeBtn.id = "rugsense-close-dropdown";
      closeBtn.className = "rugsense-close-btn";
      closeBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `;
      header.appendChild(logoWrapper);
      header.appendChild(closeBtn);
      const alertSection = document.createElement("div");
      alertSection.id = "rugsense-alert-section";
      alertSection.className = "rugsense-alert-section";
      alertSection.style.display = "none";
      alertSection.innerHTML = `
      <div class="rugsense-alert-header">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
        </svg>
        <span>Security Alert</span>
        </div>
      <div id="rugsense-alert-details" class="rugsense-alert-details"></div>
      <button id="rugsense-alert-close" class="rugsense-alert-close">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    `;
      const actions = document.createElement("div");
      actions.className = "rugsense-actions";
      actions.innerHTML = `
      <div class="rugsense-button-column">
        <button id="rugsense-manage-addresses" class="rugsense-btn rugsense-btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="8.5" cy="7" r="4"></circle>
            <line x1="20" y1="8" x2="20" y2="14"></line>
            <line x1="23" y1="11" x2="17" y2="11"></line>
          </svg>
          <span>Manage Addresses</span>
          </button>
        
        <button id="rugsense-recent-transactions-btn" class="rugsense-btn rugsense-btn-success">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 11H5a2 2 0 0 0-2 2v3c0 1.1.9 2 2 2h4m-4-8V9a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3m-6 0h6m-6 0v8a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-8"></path>
          </svg>
          <span>Recent Transactions</span>
          </button>
        
        <button id="rugsense-blockchain-cache" class="rugsense-btn rugsense-btn-purple">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
            <path d="M2 17l10 5 10-5"></path>
            <path d="M2 12l10 5 10-5"></path>
          </svg>
          <span>Blockchain Cache</span>
          </button>
        
        <button id="rugsense-reward-system" class="rugsense-btn rugsense-btn-warning">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
          <span>Reward System</span>
          </button>
        
        <button id="rugsense-settings" class="rugsense-btn rugsense-btn-secondary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
          <span>Settings</span>
          </button>
        
        <button id="rugsense-clear-wallet" class="rugsense-btn rugsense-btn-danger">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3,6 5,6 21,6"></polyline>
            <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
          <span>Clear Wallet</span>
          </button>
      </div>
    `;
      container.appendChild(header);
      container.appendChild(alertSection);
      container.appendChild(actions);
      dropdown.appendChild(container);
      const style = document.createElement("style");
      style.textContent = `
      .rugsense-dropdown-wrapper {
        position: fixed !important;
        top: 20px !important;
        left: 20px !important;
        width: 380px !important;
        background: rgba(15, 23, 42, 0.95) !important;
        backdrop-filter: blur(20px) !important;
        border: 1px solid rgba(148, 163, 184, 0.2) !important;
        border-radius: 20px !important;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5) !important;
        z-index: 2147483647 !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        color: white !important;
        display: none !important;
        overflow: hidden !important;
      }
      
      .rugsense-dropdown-wrapper.rugsense-visible {
        display: block !important;
      }
      
      .rugsense-container {
        padding: 20px !important;
      }
      
      .rugsense-header {
        display: flex !important;
        justify-content: space-between !important;
        align-items: flex-start !important;
        margin-bottom: 24px !important;
      }
      
      .rugsense-logo-wrapper {
        display: flex !important;
        align-items: center !important;
        gap: 12px !important;
      }
      
      .rugsense-logo {
        width: 48px !important;
        height: 48px !important;
        object-fit: contain !important;
        filter: brightness(1.1) !important;
      }
      
      .rugsense-brand {
        display: flex !important;
        flex-direction: column !important;
      }
      
      .rugsense-title {
        font-size: 20px !important;
        font-weight: 700 !important;
        background: linear-gradient(135deg, #60a5fa, #a78bfa) !important;
        -webkit-background-clip: text !important;
        -webkit-text-fill-color: transparent !important;
        background-clip: text !important;
        line-height: 1.2 !important;
      }
      
      .rugsense-subtitle {
        font-size: 12px !important;
        color: #94a3b8 !important;
        font-weight: 500 !important;
        margin-top: 2px !important;
      }
      
      .rugsense-close-btn {
        background: rgba(148, 163, 184, 0.1) !important;
        border: none !important;
        border-radius: 12px !important;
        padding: 8px !important;
        color: #94a3b8 !important;
        cursor: pointer !important;
        transition: all 0.2s ease !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }
      
      .rugsense-close-btn:hover {
        background: rgba(239, 68, 68, 0.1) !important;
        color: #ef4444 !important;
        transform: scale(1.05) !important;
      }
      
      .rugsense-alert-section {
        background: linear-gradient(135deg, #1f2937, #111827) !important;
        border: 2px solid #ef4444 !important;
        border-radius: 16px !important;
        padding: 20px !important;
        margin-bottom: 20px !important;
        position: relative !important;
        box-shadow: 0 8px 25px rgba(239, 68, 68, 0.2) !important;
      }
      
      .rugsense-alert-header {
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        font-weight: 600 !important;
        font-size: 16px !important;
        margin-bottom: 12px !important;
        color: white !important;
      }
      
      .rugsense-alert-details {
        font-size: 14px !important;
        line-height: 1.5 !important;
        background: rgba(255, 255, 255, 0.05) !important;
        padding: 12px !important;
        border-radius: 8px !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        color: #e5e7eb !important;
      }
      
      .rugsense-alert-close {
        position: absolute !important;
        top: 12px !important;
        right: 12px !important;
        background: rgba(0, 0, 0, 0.3) !important;
        border: none !important;
        border-radius: 8px !important;
        color: white !important;
        cursor: pointer !important;
        padding: 6px !important;
        transition: all 0.2s ease !important;
      }
      
      .rugsense-alert-close:hover {
        background: rgba(0, 0, 0, 0.5) !important;
        transform: scale(1.1) !important;
      }
      
      .rugsense-actions {
        display: flex !important;
        flex-direction: column !important;
        gap: 12px !important;
      }
      
      .rugsense-button-column {
        display: flex !important;
        flex-direction: column !important;
        gap: 12px !important;
      }
      
      .rugsense-btn {
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        padding: 12px 16px !important;
        border: none !important;
        border-radius: 12px !important;
        font-size: 14px !important;
        font-weight: 600 !important;
        cursor: pointer !important;
        transition: all 0.2s ease !important;
        text-align: left !important;
        position: relative !important;
        overflow: hidden !important;
      }
      
      .rugsense-btn:hover {
        transform: translateY(-1px) !important;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3) !important;
      }
      
      .rugsense-btn:active {
        transform: translateY(0) !important;
      }
      
      .rugsense-btn-primary {
        background: linear-gradient(135deg, #3b82f6, #1d4ed8) !important;
        color: white !important;
      }
      
      .rugsense-btn-success {
        background: linear-gradient(135deg, #10b981, #059669) !important;
        color: white !important;
      }
      
      .rugsense-btn-warning {
        background: linear-gradient(135deg, #f59e0b, #d97706) !important;
        color: white !important;
      }
      
      .rugsense-btn-purple {
        background: linear-gradient(135deg, #8b5cf6, #7c3aed) !important;
        color: white !important;
      }
      
      .rugsense-btn-secondary {
        background: linear-gradient(135deg, #6b7280, #4b5563) !important;
        color: white !important;
      }
      
      .rugsense-btn-danger {
        background: linear-gradient(135deg, #ef4444, #dc2626) !important;
        color: white !important;
      }
      
      .rugsense-btn-warning {
        background: linear-gradient(135deg, #f59e0b, #d97706) !important;
        color: white !important;
      }
      
      /* Reward System Styles */
      .rugsense-reward-container {
        padding: 20px;
      }
      
      .rugsense-reward-info {
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        padding: 20px;
        border-radius: 12px;
        margin-bottom: 20px;
        text-align: center;
      }
      
      .rugsense-reward-info h3 {
        margin: 0 0 10px 0;
        font-size: 24px;
        font-weight: bold;
      }
      
      .rugsense-reward-info p {
        margin: 0;
        opacity: 0.9;
      }
      
      .rugsense-reward-form {
        margin-bottom: 20px;
      }
      
      .rugsense-reward-form label {
        display: block;
        margin-bottom: 8px;
        font-weight: 600;
        color: #374151;
      }
      
      .rugsense-reward-stats {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 15px;
        margin-bottom: 20px;
      }
      
      .rugsense-stat-item {
        background: #f8fafc;
        padding: 15px;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
      }
      
      .rugsense-stat-label {
        font-size: 12px;
        color: #64748b;
        margin-bottom: 5px;
      }
      
      .rugsense-stat-value {
        font-size: 18px;
        font-weight: bold;
        color: #1e293b;
      }
      
      .rugsense-reward-history h4 {
        margin: 0 0 15px 0;
        color: #374151;
      }
      
      .rugsense-reward-list {
        max-height: 300px;
        overflow-y: auto;
      }
      
      .rugsense-reward-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px;
        background: #f8fafc;
        border-radius: 8px;
        margin-bottom: 8px;
        border: 1px solid #e2e8f0;
      }
      
      .rugsense-reward-info {
        flex: 1;
      }
      
      .rugsense-reward-contract {
        font-weight: 600;
        color: #1e293b;
        margin-bottom: 4px;
      }
      
      .rugsense-reward-address {
        font-size: 12px;
        color: #64748b;
        font-family: monospace;
        margin-bottom: 4px;
      }
      
      .rugsense-reward-time {
        font-size: 11px;
        color: #94a3b8;
      }
      
      .rugsense-reward-amount {
        font-weight: bold;
        color: #10b981;
        font-size: 16px;
      }
      
      /* Reward Notification */
      .rugsense-reward-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        background: white;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        border: 1px solid #e2e8f0;
        animation: slideInRight 0.3s ease-out;
      }
      
      .rugsense-reward-notification-content {
        display: flex;
        align-items: center;
        padding: 16px;
        gap: 12px;
      }
      
      .rugsense-reward-notification-icon {
        font-size: 24px;
      }
      
      .rugsense-reward-notification-text {
        flex: 1;
      }
      
      .rugsense-reward-notification-title {
        font-weight: bold;
        color: #1e293b;
        margin-bottom: 4px;
      }
      
      .rugsense-reward-notification-desc {
        font-size: 14px;
        color: #64748b;
      }
      
      .rugsense-reward-notification-close {
        background: none;
        border: none;
        font-size: 20px;
        color: #94a3b8;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
      }
      
      .rugsense-reward-notification-close:hover {
        background: #f1f5f9;
        color: #64748b;
      }
      
      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      .rugsense-btn span {
        flex: 1 !important;
      }
      
      .rugsense-btn svg {
        flex-shrink: 0 !important;
      }
      
      /* Legacy styles for compatibility */
      .rugsense-dropdown-container {
        padding: 0 !important;
      }
      
      .rugsense-dropdown-header {
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        padding: 16px 20px !important;
        border-bottom: 1px solid #333 !important;
        background: #2a2a2a !important;
        border-radius: 12px 12px 0 0 !important;
      }
      
      .rugsense-logo {
        font-weight: bold !important;
        font-size: 16px !important;
      }
      
      .rugsense-status {
        font-size: 12px !important;
        color: #9cd2ec !important;
        background: rgba(74, 222, 128, 0.1) !important;
        padding: 4px 8px !important;
        border-radius: 6px !important;
      }
      
      .rugsense-dropdown-content {
        padding: 12px !important;
        max-height: 300px !important;
        overflow-y: auto !important;
      }
      
      .rugsense-section {
        margin-bottom: 12px !important;
      }
      
      .rugsense-section:last-child {
        margin-bottom: 0 !important;
      }
      
      .rugsense-section-title {
        font-size: 14px !important;
        font-weight: 600 !important;
        margin-bottom: 12px !important;
        color: #e5e5e5 !important;
      }
      
      .rugsense-address-list {
        margin-bottom: 12px !important;
      }
      
      .rugsense-address-item {
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        padding: 8px 12px !important;
        background: #2a2a2a !important;
        border-radius: 6px !important;
        margin-bottom: 6px !important;
        font-size: 12px !important;
      }
      
      .rugsense-address-text {
        font-family: monospace !important;
        color: #e5e5e5 !important;
      }
      
      .rugsense-remove-btn {
        background: #ef4444 !important;
        color: white !important;
        border: none !important;
        padding: 4px 8px !important;
        border-radius: 4px !important;
        font-size: 10px !important;
        cursor: pointer !important;
      }
      
      .rugsense-remove-btn:hover {
        background: #dc2626 !important;
      }
      
      @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.02); }
        100% { transform: scale(1); }
      }
      
      .rugsense-add-address {
        display: flex !important;
        gap: 8px !important;
      }
      
      #rugsense-address-input {
        flex: 1 !important;
        padding: 8px 12px !important;
        background: #2a2a2a !important;
        border: 1px solid #444 !important;
        border-radius: 6px !important;
        color: white !important;
        font-size: 12px !important;
      }
      
      #rugsense-address-input:focus {
        outline: none !important;
        border-color: #9cd2ec !important;
      }
      
      #rugsense-add-btn {
        padding: 8px 16px !important;
        background: #9cd2ec !important;
        color: #1a1a1a !important;
        border: none !important;
        border-radius: 6px !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        cursor: pointer !important;
      }
      
      #rugsense-add-btn:hover {
        background: #22c55e !important;
      }
      
      .rugsense-alert-item {
        padding: 12px !important;
        background: #2a2a2a !important;
        border-radius: 6px !important;
        margin-bottom: 8px !important;
        border-left: 3px solid #9cd2ec !important;
      }
      
      .rugsense-alert-title {
        font-weight: 600 !important;
        font-size: 13px !important;
        margin-bottom: 4px !important;
      }
      
      .rugsense-alert-body {
        font-size: 11px !important;
        color: #a3a3a3 !important;
        line-height: 1.4 !important;
      }
      
      .rugsense-no-addresses,
      .rugsense-no-alerts {
        text-align: center !important;
        color: #666 !important;
        font-size: 12px !important;
        padding: 20px !important;
      }

      .logo-wrapper {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 10px !important;
        font-size: 18px !important;
        font-weight: bold !important;
        margin-bottom: 15px !important;
        color: #9cd2ec !important;
      }

      .logo-text {
        font-family: 'Play', 'Arial', sans-serif !important;
        font-size: 24px !important;
        font-weight: bold !important;
        color: #9cd2ec !important;
      }
       
      .play-bold {
        font-family: 'Play', 'Arial', sans-serif !important;
        font-weight: bold !important;
        font-size: 18px !important;
        color: #9cd2ec !important;
      }
      
      /* Modal Styles */
      .rugsense-modal-overlay {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        background: rgba(0, 0, 0, 0.8) !important;
        backdrop-filter: blur(8px) !important;
        z-index: 2147483648 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 20px !important;
      }
      
      .rugsense-modal-container {
        background: rgba(15, 23, 42, 0.95) !important;
        backdrop-filter: blur(20px) !important;
        border: 1px solid rgba(148, 163, 184, 0.2) !important;
        border-radius: 20px !important;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5) !important;
        max-height: 90vh !important;
        overflow: hidden !important;
        display: flex !important;
        flex-direction: column !important;
        width: 100% !important;
        max-width: 600px !important;
      }
      
      .rugsense-modal-large {
        max-width: 700px !important;
      }
      
      .rugsense-modal-extra-large {
        max-width: 900px !important;
      }
      
      .rugsense-modal-header {
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        padding: 24px !important;
        border-bottom: 1px solid rgba(148, 163, 184, 0.1) !important;
      }
      
      .rugsense-modal-title {
        display: flex !important;
        align-items: center !important;
        gap: 12px !important;
        font-size: 20px !important;
        font-weight: 700 !important;
        color: white !important;
      }
      
      .rugsense-modal-title svg {
        color: #60a5fa !important;
      }
      
      .rugsense-modal-close-btn {
        background: rgba(148, 163, 184, 0.1) !important;
        border: none !important;
        border-radius: 12px !important;
        padding: 8px !important;
        color: #94a3b8 !important;
        cursor: pointer !important;
        transition: all 0.2s ease !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }
      
      .rugsense-modal-close-btn:hover {
        background: rgba(239, 68, 68, 0.1) !important;
        color: #ef4444 !important;
        transform: scale(1.05) !important;
      }
      
      .rugsense-modal-content {
        padding: 24px !important;
        overflow-y: auto !important;
        flex: 1 !important;
      }
      
      /* Info Cards */
      .rugsense-info-card {
        background: rgba(255, 255, 255, 0.05) !important;
        border: 1px solid rgba(148, 163, 184, 0.1) !important;
        border-radius: 16px !important;
        padding: 20px !important;
        margin-bottom: 20px !important;
      }
      
      .rugsense-card-header {
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        font-weight: 600 !important;
        font-size: 16px !important;
        color: white !important;
        margin-bottom: 16px !important;
      }
      
      .rugsense-card-header svg {
        color: #60a5fa !important;
      }
      
      .rugsense-info-grid {
        display: grid !important;
        gap: 12px !important;
      }
      
      .rugsense-info-item {
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        padding: 8px 0 !important;
      }
      
      .rugsense-info-label {
        color: #94a3b8 !important;
        font-size: 14px !important;
      }
      
      .rugsense-info-value {
        font-weight: 600 !important;
        font-size: 14px !important;
      }
      
      .rugsense-info-primary {
        color: #60a5fa !important;
      }
      
      .rugsense-info-success {
        color: #10b981 !important;
      }
      
      .rugsense-info-warning {
        color: #f59e0b !important;
      }
      
      /* Process Steps */
      .rugsense-process-steps {
        display: flex !important;
        flex-direction: column !important;
        gap: 16px !important;
      }
      
      .rugsense-step {
        display: flex !important;
        align-items: center !important;
        gap: 16px !important;
      }
      
      .rugsense-step-number {
        width: 32px !important;
        height: 32px !important;
        border-radius: 50% !important;
        background: linear-gradient(135deg, #60a5fa, #a78bfa) !important;
        color: white !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-weight: 600 !important;
        font-size: 14px !important;
        flex-shrink: 0 !important;
      }
      
      .rugsense-step-content {
        flex: 1 !important;
      }
      
      .rugsense-step-title {
        font-weight: 600 !important;
        color: white !important;
        margin-bottom: 4px !important;
      }
      
      .rugsense-step-desc {
        color: #94a3b8 !important;
        font-size: 14px !important;
      }
      
      /* Section Styles */
      .rugsense-section-title {
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        font-weight: 600 !important;
        font-size: 16px !important;
        color: white !important;
        margin-bottom: 16px !important;
      }
      
      .rugsense-section-title svg {
        color: #60a5fa !important;
      }
      
      /* Input Groups */
      .rugsense-input-group {
        display: flex !important;
        gap: 12px !important;
        margin-bottom: 24px !important;
      }
      
      .rugsense-address-input {
        flex: 1 !important;
        padding: 12px 16px !important;
        border: 1px solid rgba(148, 163, 184, 0.2) !important;
        border-radius: 12px !important;
        background: rgba(255, 255, 255, 0.05) !important;
        color: white !important;
        font-size: 14px !important;
        transition: all 0.2s ease !important;
      }
      
      .rugsense-address-input:focus {
        outline: none !important;
        border-color: #60a5fa !important;
        box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.1) !important;
      }
      
      .rugsense-address-input::placeholder {
        color: #94a3b8 !important;
      }
      
      /* Button Sizes */
      .rugsense-btn-sm {
        padding: 8px 12px !important;
        font-size: 12px !important;
      }
      
      /* Address List */
      .rugsense-address-list-container {
        background: rgba(255, 255, 255, 0.05) !important;
        border: 1px solid rgba(148, 163, 184, 0.1) !important;
        border-radius: 16px !important;
        padding: 16px !important;
        max-height: 400px !important;
        overflow-y: auto !important;
      }
      
      .rugsense-address-item {
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        padding: 12px !important;
        background: rgba(255, 255, 255, 0.05) !important;
        border-radius: 12px !important;
        margin-bottom: 8px !important;
        transition: all 0.2s ease !important;
      }
      
      .rugsense-address-item:hover {
        background: rgba(255, 255, 255, 0.08) !important;
      }
      
      .rugsense-address-info {
        flex: 1 !important;
      }
      
      .rugsense-address-text {
        font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace !important;
        color: white !important;
        font-size: 13px !important;
        margin-bottom: 4px !important;
      }
      
      .rugsense-address-status {
        display: flex !important;
        align-items: center !important;
        gap: 4px !important;
        font-size: 12px !important;
        color: #10b981 !important;
      }
      
      /* Transactions */
      .rugsense-transactions-container {
        background: rgba(255, 255, 255, 0.05) !important;
        border: 1px solid rgba(148, 163, 184, 0.1) !important;
        border-radius: 16px !important;
        padding: 16px !important;
        max-height: 500px !important;
        overflow-y: auto !important;
      }
      
      .rugsense-tx-item {
        display: flex !important;
        align-items: center !important;
        gap: 12px !important;
        padding: 12px !important;
        background: rgba(255, 255, 255, 0.05) !important;
        border-radius: 12px !important;
        margin-bottom: 8px !important;
        transition: all 0.2s ease !important;
      }
      
      .rugsense-tx-item:hover {
        background: rgba(255, 255, 255, 0.08) !important;
      }
      
      .rugsense-tx-icon {
        width: 32px !important;
        height: 32px !important;
        border-radius: 8px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        flex-shrink: 0 !important;
      }
      
      .rugsense-tx-deploy .rugsense-tx-icon {
        background: linear-gradient(135deg, #8b5cf6, #7c3aed) !important;
      }
      
      .rugsense-tx-transfer .rugsense-tx-icon {
        background: linear-gradient(135deg, #3b82f6, #1d4ed8) !important;
      }
      
      .rugsense-tx-mint .rugsense-tx-icon {
        background: linear-gradient(135deg, #10b981, #059669) !important;
      }
      
      .rugsense-tx-content {
        flex: 1 !important;
      }
      
      .rugsense-tx-type {
        font-weight: 600 !important;
        color: white !important;
        margin-bottom: 4px !important;
      }
      
      .rugsense-tx-details {
        font-size: 12px !important;
        color: #94a3b8 !important;
        margin-bottom: 4px !important;
      }
      
      .rugsense-tx-time {
        font-size: 11px !important;
        color: #64748b !important;
      }
      
      /* Empty States */
      .rugsense-empty-state {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        padding: 40px 20px !important;
        color: #94a3b8 !important;
      }
      
      .rugsense-empty-icon {
        font-size: 48px !important;
        margin-bottom: 16px !important;
      }
      
      .rugsense-empty-text {
        font-size: 16px !important;
        font-weight: 600 !important;
        margin-bottom: 8px !important;
        color: white !important;
      }
      
      .rugsense-empty-subtext {
        font-size: 14px !important;
        color: #94a3b8 !important;
      }
    `;
      if (document.head) {
        document.head.appendChild(style);
      } else {
        console.warn("[Rugsense/inpage] document.head not available");
      }
      if (document.body) {
        document.body.appendChild(dropdown);
      } else {
        console.warn("[Rugsense/inpage] document.body not available");
      }
      dropdown.style.display = "none";
      setupDropdownEvents();
      getTrackedAddresses();
      updateRecentTransactions();
      console.log("[Rugsense/inpage] Dropdown created and ready!");
    }
    function updateTrackedAddresses() {
      const container = document.getElementById("rugsense-tracked-addresses");
      if (container) {
        if (trackedAddresses.length === 0) {
          container.innerHTML = '<div style="color: #9ca3af;">No addresses tracked yet</div>';
        } else {
          container.innerHTML = trackedAddresses.map(
            (addr) => `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; padding: 5px; background: #1f2937; border-radius: 4px;">
            <span style="font-family: monospace; font-size: 11px;">${addr}</span>
            <button class="rugsense-remove-address-btn" data-address="${addr}" style="background: #dc2626; color: white; border: none; border-radius: 3px; padding: 2px 6px; font-size: 10px; cursor: pointer;">Remove</button>
          </div>
        `
          ).join("");
          const removeButtons = container.querySelectorAll(
            ".rugsense-remove-address-btn"
          );
          removeButtons.forEach((button) => {
            button.addEventListener("click", (e) => {
              e.preventDefault();
              const address = button.getAttribute("data-address");
              console.log(
                "[Rugsense] Remove button clicked for address:",
                address
              );
              if (address) {
                removeAddress(address);
              }
            });
          });
        }
      }
    }
    function setupDropdownEvents() {
      const alertCloseBtn = document.getElementById("rugsense-alert-close");
      if (alertCloseBtn) {
        alertCloseBtn.addEventListener("click", () => {
          const alertSection = document.getElementById("rugsense-alert-section");
          if (alertSection) {
            alertSection.style.display = "none";
          }
        });
      }
      const manageBtn = document.getElementById("rugsense-manage-addresses");
      if (manageBtn) {
        manageBtn.addEventListener("click", () => {
          showAddressManagement();
        });
      }
      const recentBtn = document.getElementById(
        "rugsense-recent-transactions-btn"
      );
      if (recentBtn) {
        recentBtn.addEventListener("click", () => {
          showRecentTransactions();
        });
      }
      const rewardBtn = document.getElementById("rugsense-reward-system");
      if (rewardBtn) {
        rewardBtn.addEventListener("click", () => {
          createRewardSystemModal();
        });
      }
      const closeBtn = document.getElementById("rugsense-close-dropdown");
      if (closeBtn) {
        closeBtn.addEventListener("click", () => {
          const dropdown = document.getElementById("rugsense-dropdown");
          if (dropdown) {
            dropdown.classList.remove("rugsense-visible");
            dropdown.style.display = "none";
          }
        });
      }
      const settingsBtn = document.getElementById("rugsense-settings");
      if (settingsBtn) {
        settingsBtn.addEventListener("click", () => {
          showSettings();
        });
      }
      const blockchainBtn = document.getElementById("rugsense-blockchain-cache");
      if (blockchainBtn) {
        blockchainBtn.addEventListener("click", () => {
          showBlockchainCache();
        });
      }
      const clearBtn = document.getElementById("rugsense-clear-wallet");
      if (clearBtn) {
        clearBtn.addEventListener("click", () => {
          clearWalletAddress();
          console.log("[Rugsense] Algorand wallet cleared successfully");
          showWalletCleared();
        });
      }
      document.addEventListener("click", (e) => {
        const target = e.target;
        console.log("[Rugsense] Click detected on:", target);
        console.log("[Rugsense] Target classes:", target.className);
        if (target.closest(".rugsense-remove-address-btn")) {
          console.log("[Rugsense] Remove button clicked");
          const button = target.closest(
            ".rugsense-remove-address-btn"
          );
          const address = button.getAttribute("data-address");
          console.log("[Rugsense] Address to remove:", address);
          if (address) {
            removeAddress(address);
          } else {
            console.error(
              "[Rugsense] No address found in data-address attribute"
            );
          }
        }
      });
    }
    function showBlockchainCache() {
      const existing = document.getElementById("rugsense-blockchain-cache-page");
      if (existing) {
        existing.remove();
      }
      const cachePage = document.createElement("div");
      cachePage.id = "rugsense-blockchain-cache-page";
      cachePage.className = "rugsense-modal-overlay";
      cachePage.innerHTML = `
      <div class="rugsense-modal-container">
        <div class="rugsense-modal-header">
          <div class="rugsense-modal-title">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
              <path d="M2 17l10 5 10-5"></path>
              <path d="M2 12l10 5 10-5"></path>
            </svg>
            <span>Blockchain Cache</span>
        </div>
          <button id="rugsense-cache-close" class="rugsense-modal-close-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <div class="rugsense-modal-content">
          <div class="rugsense-info-card">
            <div class="rugsense-card-header">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                <path d="M2 17l10 5 10-5"></path>
                <path d="M2 12l10 5 10-5"></path>
              </svg>
              <span>Blockchain Integration</span>
            </div>
            <div class="rugsense-info-grid">
              <div class="rugsense-info-item">
                <span class="rugsense-info-label">Network:</span>
                <span class="rugsense-info-value rugsense-info-success">Ethereum Sepolia Testnet</span>
              </div>
              <div class="rugsense-info-item">
                <span class="rugsense-info-label">Cache Size:</span>
                <span class="rugsense-info-value rugsense-info-primary">${securityAnalysisCache.size} analyses</span>
              </div>
              <div class="rugsense-info-item">
                <span class="rugsense-info-label">Status:</span>
                <span class="rugsense-info-value rugsense-info-success">Active</span>
              </div>
            </div>
        </div>
        
          <div class="rugsense-info-card">
            <div class="rugsense-card-header">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>How It Works</span>
            </div>
            <div class="rugsense-process-steps">
              <div class="rugsense-step">
                <div class="rugsense-step-number">1</div>
                <div class="rugsense-step-content">
                  <div class="rugsense-step-title">Track Address</div>
                  <div class="rugsense-step-desc">Add contract addresses to monitor</div>
                </div>
              </div>
              <div class="rugsense-step">
                <div class="rugsense-step-number">2</div>
                <div class="rugsense-step-content">
                  <div class="rugsense-step-title">Auto Analysis</div>
                  <div class="rugsense-step-desc">Analysis runs on transaction detection</div>
                </div>
              </div>
              <div class="rugsense-step">
                <div class="rugsense-step-number">3</div>
                <div class="rugsense-step-content">
                  <div class="rugsense-step-title">Cache Results</div>
                  <div class="rugsense-step-desc">Results stored for future reference</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
      document.body.appendChild(cachePage);
      const closeBtn = document.getElementById("rugsense-cache-close");
      if (closeBtn) {
        closeBtn.addEventListener("click", () => {
          cachePage.remove();
        });
      }
    }
    function showWalletConnected(address) {
      const walletPage = document.createElement("div");
      walletPage.id = "rugsense-wallet-connected";
      walletPage.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
      background: rgba(0,0,0,0.9); z-index: 2147483648; 
      display: flex; align-items: center; justify-content: center;
      font-family: Arial, sans-serif;
    `;
      walletPage.innerHTML = `
      <div style="background: #1f2937; color: white; padding: 30px; border-radius: 12px; 
                  max-width: 500px; width: 90%; text-align: center;
                  border: 2px solid #10b981;">
        <h2 style="margin: 0 0 20px 0; color: #10b981; display: flex; align-items: center; gap: 8px;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #10b981;">
            <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
            <path d="M2 17l10 5 10-5"></path>
            <path d="M2 12l10 5 10-5"></path>
          </svg>
          Algorand Wallet Connected!
        </h2>
        <p style="margin: 10px 0; font-size: 14px; color: #d1d5db;">
          <strong>Address:</strong> <code style="background: #374151; padding: 4px 8px; border-radius: 4px;">${address}</code>
        </p>
        <p style="margin: 20px 0; font-size: 14px; color: #d1d5db;">
          Now you can submit analysis results to blockchain and earn 0.01 ALGO rewards!
        </p>
        <button id="rugsense-wallet-close" style="background: #10b981; color: white; border: none; 
                  padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 16px; margin-top: 20px;">
          Continue
        </button>
      </div>
    `;
      document.body.appendChild(walletPage);
      const closeBtn = document.getElementById("rugsense-wallet-close");
      if (closeBtn) {
        closeBtn.addEventListener("click", () => {
          walletPage.remove();
        });
      }
    }
    function showWalletCleared() {
      const clearedPage = document.createElement("div");
      clearedPage.id = "rugsense-wallet-cleared";
      clearedPage.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
      background: rgba(0,0,0,0.9); z-index: 2147483648; 
      display: flex; align-items: center; justify-content: center;
      font-family: Arial, sans-serif;
    `;
      clearedPage.innerHTML = `
      <div style="background: linear-gradient(135deg, #1f2937 0%, #111827 100%); 
                  color: white; padding: 40px; border-radius: 20px; 
                  max-width: 500px; width: 90%; text-align: center;
                  border: 1px solid rgba(148, 163, 184, 0.2);
                  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                  backdrop-filter: blur(20px);">
        
        <div style="width: 80px; height: 80px; margin: 0 auto 24px; 
                    background: linear-gradient(135deg, #10b981, #059669);
                    border-radius: 50%; display: flex; align-items: center; 
                    justify-content: center; position: relative; overflow: hidden;">
          
          <!-- Animated check mark -->
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="color: white; stroke-linecap: round; stroke-linejoin: round;">
            <path d="M9 12l2 2 4-4" style="stroke-dasharray: 20; stroke-dashoffset: 20; animation: checkmark 0.6s ease-in-out 0.3s forwards;"></path>
          </svg>
          
          <!-- Subtle glow effect -->
          <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                      width: 100px; height: 100px; background: radial-gradient(circle, rgba(16, 185, 129, 0.3) 0%, transparent 70%); 
                      border-radius: 50%; z-index: -1;"></div>
        </div>
        
        <style>
          @keyframes checkmark {
            to {
              stroke-dashoffset: 0;
            }
          }
        </style>
        
        <h2 style="margin: 0 0 16px 0; color: #10b981; font-size: 24px; font-weight: 700;">
          Wallet Cleared Successfully!
        </h2>
        
        <p style="margin: 0 0 24px 0; font-size: 16px; color: #d1d5db; line-height: 1.6;">
          Your Algorand wallet address has been removed from the extension. 
          You can reconnect anytime to resume blockchain rewards.
        </p>
        
        <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2);
                    border-radius: 12px; padding: 16px; margin: 20px 0;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #10b981;">
              <path d="M9 12l2 2 4-4"></path>
              <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"></path>
              <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"></path>
            </svg>
            <span style="color: #10b981; font-weight: 600; font-size: 14px;">What's Next?</span>
          </div>
          <ul style="margin: 0; padding-left: 20px; color: #9ca3af; font-size: 14px; line-height: 1.5;">
            <li>Reconnect your Algorand wallet anytime</li>
            <li>Continue monitoring tracked addresses</li>
            <li>Submit new analysis for rewards</li>
          </ul>
        </div>
        
        <button id="rugsense-cleared-close" style="background: linear-gradient(135deg, #10b981, #059669); 
                    color: white; border: none; padding: 12px 24px; border-radius: 12px; 
                    cursor: pointer; font-size: 16px; font-weight: 600; margin-top: 8px;
                    transition: all 0.2s ease; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
          Got it!
        </button>
      </div>
    `;
      document.body.appendChild(clearedPage);
      const closeBtn = document.getElementById("rugsense-cleared-close");
      if (closeBtn) {
        closeBtn.addEventListener("click", () => {
          clearedPage.remove();
        });
        closeBtn.addEventListener("mouseenter", () => {
          closeBtn.style.transform = "translateY(-2px)";
          closeBtn.style.boxShadow = "0 6px 16px rgba(16, 185, 129, 0.4)";
        });
        closeBtn.addEventListener("mouseleave", () => {
          closeBtn.style.transform = "translateY(0)";
          closeBtn.style.boxShadow = "0 4px 12px rgba(16, 185, 129, 0.3)";
        });
      }
      setTimeout(() => {
        if (document.body.contains(clearedPage)) {
          clearedPage.remove();
        }
      }, 5e3);
    }
    function showAddressManagement() {
      const existing = document.getElementById("rugsense-address-management");
      if (existing) {
        existing.remove();
      }
      const managementPage = document.createElement("div");
      managementPage.id = "rugsense-address-management";
      managementPage.className = "rugsense-modal-overlay";
      managementPage.innerHTML = `
      <div class="rugsense-modal-container rugsense-modal-large">
        <div class="rugsense-modal-header">
          <div class="rugsense-modal-title">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="8.5" cy="7" r="4"></circle>
              <line x1="20" y1="8" x2="20" y2="14"></line>
              <line x1="23" y1="11" x2="17" y2="11"></line>
            </svg>
            <span>Manage Tracked Addresses</span>
          </div>
          <button id="rugsense-close-management" class="rugsense-modal-close-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <div class="rugsense-modal-content">
          <div class="rugsense-add-address-section">
            <div class="rugsense-section-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>Add New Address</span>
            </div>
            <div class="rugsense-input-group">
              <input type="text" id="rugsense-new-address" placeholder="Ethereum address (0x...)" class="rugsense-address-input" />
              <button id="rugsense-add-new" class="rugsense-btn rugsense-btn-primary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                <span>Add</span>
            </button>
          </div>
        </div>
        
          <div class="rugsense-address-list-section">
            <div class="rugsense-section-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
              </svg>
              <span>Tracked Addresses (${trackedAddresses.length})</span>
            </div>
            <div id="rugsense-management-list" class="rugsense-address-list-container">
          ${trackedAddresses.length === 0 ? '<div class="rugsense-empty-state"><div class="rugsense-empty-icon">\u{1F4DD}</div><div class="rugsense-empty-text">No addresses tracked yet</div><div class="rugsense-empty-subtext">Add addresses above to start monitoring</div></div>' : trackedAddresses.map(
        (addr) => `
                  <div class="rugsense-address-item">
                    <div class="rugsense-address-info">
                      <div class="rugsense-address-text">${addr}</div>
                      <div class="rugsense-address-status">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <circle cx="12" cy="12" r="10"></circle>
                          <path d="M9 12l2 2 4-4"></path>
                        </svg>
                        <span>Monitoring</span>
                      </div>
                    </div>
                    <button class="rugsense-btn rugsense-btn-danger rugsense-btn-sm rugsense-remove-address-btn" data-address="${addr}">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3,6 5,6 21,6"></polyline>
                        <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                      </svg>
                      <span>Remove</span>
                    </button>
              </div>
            `
      ).join("")}
            </div>
          </div>
        </div>
      </div>
    `;
      document.body.appendChild(managementPage);
      const closeBtn = document.getElementById("rugsense-close-management");
      const addBtn = document.getElementById("rugsense-add-new");
      const addressInput = document.getElementById("rugsense-new-address");
      if (closeBtn) {
        closeBtn.addEventListener("click", () => {
          managementPage.remove();
        });
      }
      if (addBtn && addressInput) {
        addBtn.addEventListener("click", () => {
          const address = addressInput.value.trim();
          if (address && isValidEthereumAddress(address)) {
            window.postMessage(
              {
                target: "RugsenseContent",
                type: "Rugsense/AddAddress",
                address
              },
              "*"
            );
            trackedAddresses.push(address.toLowerCase());
            addressInput.value = "";
            updateManagementList();
          }
        });
        addressInput.addEventListener("keypress", (e) => {
          if (e.key === "Enter") {
            addBtn.click();
          }
        });
      }
      managementPage.addEventListener("click", (e) => {
        const target = e.target;
        if (target.closest(".rugsense-remove-address-btn")) {
          const button = target.closest(
            ".rugsense-remove-address-btn"
          );
          const address = button.getAttribute("data-address");
          if (address) {
            removeAddress(address);
          }
        }
      });
      function updateManagementList() {
        const list = document.getElementById("rugsense-management-list");
        if (list) {
          list.innerHTML = trackedAddresses.length === 0 ? '<div style="color: #9ca3af; text-align: center; padding: 20px;">No addresses tracked yet</div>' : trackedAddresses.map(
            (addr) => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #1f2937; border-radius: 6px; margin-bottom: 8px;">
              <span style="font-family: monospace; color: #e5e5e5; font-size: 12px;">${addr}</span>
              <button class="rugsense-remove-address-btn" data-address="${addr}" style="background: #ef4444; color: white; border: none; border-radius: 4px; padding: 6px 12px; cursor: pointer; font-size: 12px;">Remove</button>
            </div>
          `
          ).join("");
          const removeButtons = list.querySelectorAll(
            ".rugsense-remove-address-btn"
          );
          removeButtons.forEach((button) => {
            button.addEventListener("click", (e) => {
              e.preventDefault();
              const address = button.getAttribute("data-address");
              console.log(
                "[Rugsense] Remove button clicked for address:",
                address
              );
              if (address) {
                removeAddress(address);
              }
            });
          });
        }
      }
    }
    function showRecentTransactions() {
      const existing = document.getElementById(
        "rugsense-recent-transactions-page"
      );
      if (existing) {
        existing.remove();
      }
      const transactionsPage = document.createElement("div");
      transactionsPage.id = "rugsense-recent-transactions-page";
      transactionsPage.className = "rugsense-modal-overlay";
      transactionsPage.innerHTML = `
      <div class="rugsense-modal-container rugsense-modal-extra-large">
        <div class="rugsense-modal-header">
          <div class="rugsense-modal-title">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 11H5a2 2 0 0 0-2 2v3c0 1.1.9 2 2 2h4m-4-8V9a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3m-6 0h6m-6 0v8a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-8"></path>
            </svg>
            <span>Recent Transactions (${recentTransactions.length})</span>
          </div>
          <button id="rugsense-close-transactions" class="rugsense-modal-close-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <div class="rugsense-modal-content">
          <div id="rugsense-transactions-list" class="rugsense-transactions-container">
          ${recentTransactions.length === 0 ? '<div class="rugsense-empty-state"><div class="rugsense-empty-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: #94a3b8;"><path d="M9 19v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2zm0 0V9a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v10m-6 0a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2m0 0V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z"></path></svg></div><div class="rugsense-empty-text">No recent transactions</div><div class="rugsense-empty-subtext">Transactions will appear here when detected</div></div>' : recentTransactions.map((tx) => {
        const timeAgo = Math.floor(
          (Date.now() - tx.timestamp) / 1e3
        );
        const timeStr = timeAgo < 60 ? `${timeAgo}s ago` : `${Math.floor(timeAgo / 60)}m ago`;
        let details = "";
        let iconType = "";
        let txClass = "";
        if (tx.type === "Contract Deployment") {
          details = `Bytecode: ${tx.details.bytecodeLength} bytes`;
          iconType = "deploy";
          txClass = "rugsense-tx-deploy";
        } else if (tx.type === "ETH Transfer") {
          const value = parseInt(tx.details.value || "0", 16) / 1e18;
          details = `Value: ${value.toFixed(4)} ETH`;
          iconType = "transfer";
          txClass = "rugsense-tx-transfer";
        } else if (tx.type === "Mint") {
          const contractName = tx.details.contractName ? ` (${tx.details.contractName})` : "";
          const network = tx.details.network ? ` | ${tx.details.network}` : "";
          const securityRisk = tx.details.securityRisk ? ` | ${tx.details.securityRisk}` : "";
          details = `Mint to: ${tx.details.from?.slice(
            0,
            8
          )}... | ${tx.details.verified ? '<span style="display: inline-flex; align-items: center; gap: 4px; color: #10b981;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4"></path></svg>Verified</span>' : '<span style="display: inline-flex; align-items: center; gap: 4px; color: #ef4444;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18"></path><path d="M6 6l12 12"></path></svg>UNVERIFIED</span>'}${contractName}${network}${securityRisk}`;
          iconType = "mint";
          txClass = "rugsense-tx-mint";
        } else if (tx.type === "Token Transfer") {
          const contractName = tx.details.contractName ? ` (${tx.details.contractName})` : "";
          const network = tx.details.network ? ` | ${tx.details.network}` : "";
          const securityRisk = tx.details.securityRisk ? ` | ${tx.details.securityRisk}` : "";
          details = `Transfer | ${tx.details.verified ? '<span style="display: inline-flex; align-items: center; gap: 4px; color: #10b981;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4"></path></svg>Verified</span>' : '<span style="display: inline-flex; align-items: center; gap: 4px; color: #ef4444;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18"></path><path d="M6 6l12 12"></path></svg>UNVERIFIED</span>'}${contractName}${network}${securityRisk}`;
        } else if (tx.type === "Token Approval") {
          const contractName = tx.details.contractName ? ` (${tx.details.contractName})` : "";
          const network = tx.details.network ? ` | ${tx.details.network}` : "";
          const securityRisk = tx.details.securityRisk ? ` | ${tx.details.securityRisk}` : "";
          details = `Approval | ${tx.details.verified ? '<span style="display: inline-flex; align-items: center; gap: 4px; color: #10b981;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4"></path></svg>Verified</span>' : '<span style="display: inline-flex; align-items: center; gap: 4px; color: #ef4444;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18"></path><path d="M6 6l12 12"></path></svg>UNVERIFIED</span>'}${contractName}${network}${securityRisk}`;
        } else if (tx.type === "Set Approval For All") {
          const contractName = tx.details.contractName ? ` (${tx.details.contractName})` : "";
          const network = tx.details.network ? ` | ${tx.details.network}` : "";
          const securityRisk = tx.details.securityRisk ? ` | ${tx.details.securityRisk}` : "";
          details = `Set Approval | ${tx.details.verified ? '<span style="display: inline-flex; align-items: center; gap: 4px; color: #10b981;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4"></path></svg>Verified</span>' : '<span style="display: inline-flex; align-items: center; gap: 4px; color: #ef4444;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18"></path><path d="M6 6l12 12"></path></svg>UNVERIFIED</span>'}${contractName}${network}${securityRisk}`;
        } else {
          const contractName = tx.details.contractName ? ` (${tx.details.contractName})` : "";
          const network = tx.details.network ? ` | ${tx.details.network}` : "";
          const securityRisk = tx.details.securityRisk ? ` | ${tx.details.securityRisk}` : "";
          details = `Method: ${tx.details.method} | ${tx.details.verified ? '<span style="display: inline-flex; align-items: center; gap: 4px; color: #10b981;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4"></path></svg>Verified</span>' : '<span style="display: inline-flex; align-items: center; gap: 4px; color: #ef4444;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18"></path><path d="M6 6l12 12"></path></svg>UNVERIFIED</span>'}${contractName}${network}${securityRisk}`;
        }
        return `
                <div style="margin-bottom: 15px; padding: 15px; background: #1f2937; border-radius: 8px; border-left: 4px solid #9cd2ec;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <div style="font-weight: bold; color: #9cd2ec; font-size: 14px;">${tx.type}</div>
                    <div style="color: #6b7280; font-size: 12px;">${timeStr}</div>
                  </div>
                  <div style="color: #d1d5db; font-size: 12px; margin-bottom: 5px; font-family: monospace;">${tx.address}</div>
                  <div style="color: #9ca3af; font-size: 11px;">${details}</div>
                </div>
              `;
      }).join("")}
        </div>
      </div>
    `;
      document.body.appendChild(transactionsPage);
      const closeBtn = document.getElementById("rugsense-close-transactions");
      if (closeBtn) {
        closeBtn.addEventListener("click", () => {
          transactionsPage.remove();
        });
      }
    }
    function createRewardSystemModal() {
      const rewardPage = document.createElement("div");
      rewardPage.id = "rugsense-reward-system-page";
      rewardPage.className = "rugsense-modal-overlay";
      rewardPage.innerHTML = `
      <div class="rugsense-modal-container rugsense-modal-large">
        <div class="rugsense-modal-header">
          <div class="rugsense-modal-title">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            <span>Reward System</span>
          </div>
          <button id="rugsense-close-reward" class="rugsense-modal-close-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <div class="rugsense-modal-content">
          <div class="rugsense-reward-container">
            <div class="rugsense-reward-info">
              <h3>\u{1F389} Earn ALGO Rewards!</h3>
              <p>Get 1 ALGO token for each new contract you analyze for the first time.</p>
            </div>
            
            <div class="rugsense-reward-form">
              <label for="rugsense-algo-address">Algorand Address:</label>
              <input type="text" id="rugsense-algo-address" placeholder="Enter your Algorand address..." class="rugsense-address-input" />
              <button id="rugsense-save-algo-address" class="rugsense-btn rugsense-btn-primary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                  <polyline points="17,21 17,13 7,13 7,21"></polyline>
                  <polyline points="7,3 7,8 15,8"></polyline>
                </svg>
                <span>Save Address</span>
              </button>
            </div>
            
            <div class="rugsense-reward-stats">
              <div class="rugsense-stat-item">
                <div class="rugsense-stat-label">Total Rewards Earned:</div>
                <div class="rugsense-stat-value" id="rugsense-total-rewards">0 ALGO</div>
              </div>
              <div class="rugsense-stat-item">
                <div class="rugsense-stat-label">Contracts Analyzed:</div>
                <div class="rugsense-stat-value" id="rugsense-contracts-analyzed">0</div>
              </div>
              <div class="rugsense-stat-item">
                <div class="rugsense-stat-label">Current Address:</div>
                <div class="rugsense-stat-value" id="rugsense-current-address">Not set</div>
              </div>
            </div>
            
            <div class="rugsense-reward-history">
              <h4>Recent Rewards</h4>
              <div id="rugsense-reward-history-list" class="rugsense-reward-list">
                <div class="rugsense-empty-state">
                  <div class="rugsense-empty-text">No rewards yet</div>
                  <div class="rugsense-empty-subtext">Start analyzing contracts to earn ALGO rewards!</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
      document.body.appendChild(rewardPage);
      const closeBtn = document.getElementById("rugsense-close-reward");
      if (closeBtn) {
        closeBtn.addEventListener("click", () => {
          rewardPage.remove();
        });
      }
      loadRewardData();
      const saveBtn = document.getElementById("rugsense-save-algo-address");
      if (saveBtn) {
        saveBtn.addEventListener("click", saveAlgoAddress);
      }
    }
    function loadRewardData() {
      try {
        const savedAddress = localStorage.getItem("rugsense-algo-address");
        const savedHistory = localStorage.getItem("rugsense-reward-history");
        const savedContracts = localStorage.getItem("rugsense-analyzed-contracts");
        if (savedAddress) {
          const addressInput = document.getElementById("rugsense-algo-address");
          if (addressInput) {
            addressInput.value = savedAddress;
          }
          updateCurrentAddress(savedAddress);
        }
        if (savedHistory) {
          const history = JSON.parse(savedHistory);
          rewardHistory.push(...history);
          updateRewardHistory();
        }
        if (savedContracts) {
          const contracts = JSON.parse(savedContracts);
          contracts.forEach((contract) => analyzedContracts.add(contract));
        }
        updateRewardStats();
      } catch (error) {
        console.error("[Rugsense/inpage] Error loading reward data:", error);
      }
    }
    function saveAlgoAddress() {
      const addressInput = document.getElementById("rugsense-algo-address");
      if (!addressInput) return;
      const address = addressInput.value.trim();
      if (!address) {
        alert("Please enter a valid Algorand address");
        return;
      }
      if (address.length !== 58 || !address.startsWith("A")) {
        alert("Please enter a valid Algorand address (58 characters, starts with A)");
        return;
      }
      try {
        localStorage.setItem("rugsense-algo-address", address);
        updateCurrentAddress(address);
        alert("Algorand address saved successfully!");
      } catch (error) {
        console.error("[Rugsense/inpage] Error saving Algo address:", error);
        alert("Error saving address. Please try again.");
      }
    }
    function updateCurrentAddress(address) {
      const currentAddressEl = document.getElementById("rugsense-current-address");
      if (currentAddressEl) {
        currentAddressEl.textContent = address;
      }
    }
    function updateRewardStats() {
      const totalRewardsEl = document.getElementById("rugsense-total-rewards");
      const contractsAnalyzedEl = document.getElementById("rugsense-contracts-analyzed");
      if (totalRewardsEl) {
        const totalRewards = rewardHistory.reduce((sum, reward) => sum + reward.rewardAmount, 0);
        totalRewardsEl.textContent = `${totalRewards} ALGO`;
      }
      if (contractsAnalyzedEl) {
        contractsAnalyzedEl.textContent = analyzedContracts.size.toString();
      }
    }
    function updateRewardHistory() {
      const historyList = document.getElementById("rugsense-reward-history-list");
      if (!historyList) return;
      if (rewardHistory.length === 0) {
        historyList.innerHTML = `
        <div class="rugsense-empty-state">
          <div class="rugsense-empty-text">No rewards yet</div>
          <div class="rugsense-empty-subtext">Start analyzing contracts to earn ALGO rewards!</div>
        </div>
      `;
        return;
      }
      const historyHTML = rewardHistory.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10).map((reward) => `
        <div class="rugsense-reward-item">
          <div class="rugsense-reward-info">
            <div class="rugsense-reward-contract">${reward.contractName}</div>
            <div class="rugsense-reward-address">${reward.contractAddress}</div>
            <div class="rugsense-reward-time">${new Date(reward.timestamp).toLocaleString()}</div>
          </div>
          <div class="rugsense-reward-amount">+${reward.rewardAmount} ALGO</div>
        </div>
      `).join("");
      historyList.innerHTML = historyHTML;
    }
    function checkAndRewardFirstAnalysis(contractAddress, contractName) {
      if (analyzedContracts.has(contractAddress)) {
        return;
      }
      analyzedContracts.add(contractAddress);
      const reward = {
        contractAddress,
        contractName,
        rewardAmount: 1,
        timestamp: Date.now()
      };
      rewardHistory.push(reward);
      try {
        localStorage.setItem("rugsense-analyzed-contracts", JSON.stringify([...analyzedContracts]));
        localStorage.setItem("rugsense-reward-history", JSON.stringify(rewardHistory));
      } catch (error) {
        console.error("[Rugsense/inpage] Error saving reward data:", error);
      }
      updateRewardStats();
      updateRewardHistory();
      showRewardNotification(contractName, contractAddress);
      console.log(`[Rugsense/inpage] \u{1F389} First analysis reward: 1 ALGO for ${contractName} (${contractAddress})`);
    }
    function showRewardNotification(contractName, contractAddress) {
      const notification = document.createElement("div");
      notification.className = "rugsense-reward-notification";
      notification.innerHTML = `
      <div class="rugsense-reward-notification-content">
        <div class="rugsense-reward-notification-icon">\u{1F389}</div>
        <div class="rugsense-reward-notification-text">
          <div class="rugsense-reward-notification-title">Reward Earned!</div>
          <div class="rugsense-reward-notification-desc">+1 ALGO for analyzing ${contractName}</div>
        </div>
        <button class="rugsense-reward-notification-close">\xD7</button>
      </div>
    `;
      document.body.appendChild(notification);
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 5e3);
      const closeBtn = notification.querySelector(".rugsense-reward-notification-close");
      if (closeBtn) {
        closeBtn.addEventListener("click", () => {
          notification.remove();
        });
      }
    }
    function showSettings() {
      alert("Settings page coming soon!");
    }
    function updateDropdownContent() {
      const addressList = document.getElementById("rugsense-address-list");
      if (addressList) {
        if (trackedAddresses.length === 0) {
          addressList.innerHTML = '<div class="rugsense-no-addresses">No addresses tracked</div>';
        } else {
          addressList.innerHTML = trackedAddresses.map(
            (addr) => `
          <div class="rugsense-address-item">
            <span class="rugsense-address-text">${addr}</span>
            <button class="rugsense-remove-btn rugsense-remove-address-btn" data-address="${addr}">Remove</button>
          </div>
        `
          ).join("");
        }
      }
    }
    function removeAddress(address) {
      console.log("[Rugsense] Removing address:", address);
      window.postMessage(
        {
          target: "RugsenseContent",
          type: "Rugsense/RemoveAddress",
          address
        },
        "*"
      );
      trackedAddresses = trackedAddresses.filter(
        (addr) => addr.toLowerCase() !== address.toLowerCase()
      );
      updateTrackedAddresses();
      const managementPage = document.getElementById("rugsense-management-page");
      if (managementPage) {
        const list = document.getElementById("rugsense-management-list");
        if (list) {
          if (trackedAddresses.length === 0) {
            list.innerHTML = '<div style="color: #9ca3af; text-align: center; padding: 20px;">No addresses tracked yet</div>';
          } else {
            list.innerHTML = trackedAddresses.map(
              (addr) => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #1f2937; border-radius: 6px; margin-bottom: 8px;">
              <span style="font-family: monospace; color: #e5e5e5; font-size: 12px;">${addr}</span>
              <button class="rugsense-remove-address-btn" data-address="${addr}" style="background: #ef4444; color: white; border: none; border-radius: 4px; padding: 6px 12px; cursor: pointer; font-size: 12px;">Remove</button>
            </div>
          `
            ).join("");
            const removeButtons = list.querySelectorAll(
              ".rugsense-remove-address-btn"
            );
            removeButtons.forEach((button) => {
              button.addEventListener("click", (e) => {
                e.preventDefault();
                const address2 = button.getAttribute("data-address");
                console.log(
                  "[Rugsense] Remove button clicked for address:",
                  address2
                );
                if (address2) {
                  removeAddress(address2);
                }
              });
            });
          }
        }
      }
      console.log("[Rugsense] Address removed successfully");
    }
    function addRecentTransaction(tx) {
      const isDuplicate = recentTransactions.some(
        (existing) => existing.id === tx.id
      );
      if (!isDuplicate) {
        recentTransactions.unshift(tx);
        if (recentTransactions.length > 10) {
          recentTransactions = recentTransactions.slice(0, 10);
        }
        updateRecentTransactions();
      } else {
        console.log("[Rugsense/inpage] Duplicate transaction prevented:", tx.id);
      }
    }
    function updateRecentTransactions() {
      const container = document.getElementById("rugsense-recent-transactions");
      if (container) {
        if (recentTransactions.length === 0) {
          container.innerHTML = '<div style="color: #9ca3af;">No recent transactions</div>';
        } else {
          container.innerHTML = recentTransactions.map((tx) => {
            const timeAgo = Math.floor((Date.now() - tx.timestamp) / 1e3);
            const timeStr = timeAgo < 60 ? `${timeAgo}s ago` : `${Math.floor(timeAgo / 60)}m ago`;
            let details = "";
            if (tx.type === "Contract Deployment") {
              details = `Bytecode: ${tx.details.bytecodeLength} bytes`;
            } else if (tx.type === "ETH Transfer") {
              const value = parseInt(tx.details.value || "0", 16) / 1e18;
              details = `Value: ${value.toFixed(4)} ETH`;
            } else if (tx.type === "Mint") {
              details = `Mint to: ${short(tx.details.from)} | Verified: ${tx.details.verified ? '<span style="display: inline-flex; align-items: center; gap: 4px; color: #10b981;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4"></path></svg></span>' : '<span style="display: inline-flex; align-items: center; gap: 4px; color: #ef4444;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18"></path><path d="M6 6l12 12"></path></svg></span>'}`;
            } else if (tx.type === "Token Transfer") {
              details = `Transfer | Verified: ${tx.details.verified ? '<span style="display: inline-flex; align-items: center; gap: 4px; color: #10b981;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4"></path></svg></span>' : '<span style="display: inline-flex; align-items: center; gap: 4px; color: #ef4444;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18"></path><path d="M6 6l12 12"></path></svg></span>'}`;
            } else if (tx.type === "Token Approval") {
              details = `Approval | Verified: ${tx.details.verified ? '<span style="display: inline-flex; align-items: center; gap: 4px; color: #10b981;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4"></path></svg></span>' : '<span style="display: inline-flex; align-items: center; gap: 4px; color: #ef4444;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18"></path><path d="M6 6l12 12"></path></svg></span>'}`;
            } else if (tx.type === "Set Approval For All") {
              details = `Set Approval | Verified: ${tx.details.verified ? '<span style="display: inline-flex; align-items: center; gap: 4px; color: #10b981;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4"></path></svg></span>' : '<span style="display: inline-flex; align-items: center; gap: 4px; color: #ef4444;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18"></path><path d="M6 6l12 12"></path></svg></span>'}`;
            } else {
              details = `Method: ${tx.details.method} | Verified: ${tx.details.verified ? '<span style="display: inline-flex; align-items: center; gap: 4px; color: #10b981;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4"></path></svg></span>' : '<span style="display: inline-flex; align-items: center; gap: 4px; color: #ef4444;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18"></path><path d="M6 6l12 12"></path></svg></span>'}`;
            }
            return `
            <div style="margin-bottom: 8px; padding: 6px; background: #1f2937; border-radius: 4px; border-left: 3px solid #9cd2ec;">
              <div style="font-weight: bold; color: #9cd2ec; font-size: 11px;">${tx.type}</div>
              <div style="color: #d1d5db; font-size: 10px; margin: 2px 0;">${short(
              tx.address
            )}</div>
              <div style="color: #9ca3af; font-size: 9px;">${details}</div>
              <div style="color: #6b7280; font-size: 9px; text-align: right;">${timeStr}</div>
            </div>
          `;
          }).join("");
        }
      }
    }
    function toggleDropdown() {
      const dropdown = document.getElementById("rugsense-dropdown");
      if (dropdown) {
        const isVisible = dropdown.classList.contains("rugsense-visible");
        if (isVisible) {
          dropdown.classList.remove("rugsense-visible");
          console.log("[Rugsense/inpage] Dropdown hidden");
        } else {
          dropdown.classList.add("rugsense-visible");
          console.log("[Rugsense/inpage] Dropdown shown");
        }
        console.log(`[Rugsense/inpage] Dropdown computed style:`, {
          display: window.getComputedStyle(dropdown).display,
          visibility: window.getComputedStyle(dropdown).visibility,
          opacity: window.getComputedStyle(dropdown).opacity,
          zIndex: window.getComputedStyle(dropdown).zIndex,
          position: window.getComputedStyle(dropdown).position,
          top: window.getComputedStyle(dropdown).top,
          right: window.getComputedStyle(dropdown).right,
          classes: dropdown.className
        });
      } else {
        console.log("[Rugsense/inpage] Dropdown element not found!");
      }
    }
    window.toggleRugsenseDropdown = toggleDropdown;
    window.addEventListener("message", (event) => {
      if (event.source !== window) return;
      const data = event.data;
      if (data && data.target === "RugsenseInpage" && data.type === "Rugsense/ToggleDropdown") {
        console.log("[Rugsense/inpage] Toggle dropdown message received");
        toggleDropdown();
      }
    });
    function setupGlobalHooks() {
      const w = window;
      if (w.ethereum) {
        console.log("[Rugsense/inpage] Setting up global ethereum hook");
        const originalEthereum = w.ethereum;
        w.ethereum = new Proxy(originalEthereum, {
          get(target, prop) {
            if (prop === "request") {
              return new Proxy(target.request, {
                apply: async (fn, thisArg, args) => {
                  console.log(
                    "[Rugsense/inpage] Global ethereum.request called:",
                    args
                  );
                  return await fn.apply(thisArg, args);
                }
              });
            }
            return target[prop];
          }
        });
      }
      if (w.web3) {
        console.log("[Rugsense/inpage] Setting up global web3 hook");
        const originalWeb3 = w.web3;
        w.web3 = new Proxy(originalWeb3, {
          get(target, prop) {
            if (prop === "eth") {
              const eth = target.eth;
              return new Proxy(eth, {
                get(ethTarget, ethProp) {
                  if (ethProp === "sendTransaction") {
                    return new Proxy(ethTarget.sendTransaction, {
                      apply: async (fn, thisArg, args) => {
                        console.log(
                          "[Rugsense/inpage] Global web3.eth.sendTransaction called:",
                          args
                        );
                        post("Rugsense/ApproveDetected", {
                          title: "Web3 Transaction",
                          body: "Transaction via web3.eth.sendTransaction"
                        });
                        return await fn.apply(thisArg, args);
                      }
                    });
                  }
                  return ethTarget[ethProp];
                }
              });
            }
            return target[prop];
          }
        });
      }
    }
    setupGlobalHooks();
    function setupNetworkMonitoring() {
      console.log("[Rugsense/inpage] Setting up network monitoring");
      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        const [resource, config] = args;
        const url = typeof resource === "string" ? resource : resource.url;
        if (url.includes("eth_") || url.includes("rpc") || url.includes("infura") || url.includes("alchemy")) {
          console.log(
            "[Rugsense/inpage] RPC request detected:",
            url,
            config?.body
          );
          if (config?.body && typeof config.body === "string") {
            try {
              const body = JSON.parse(config.body);
              if (body.method === "eth_sendTransaction" && body.params && body.params[0]) {
                const tx = body.params[0];
                const from = tx.from?.toLowerCase();
                const to = tx.to?.toLowerCase();
                const isTrackedFrom = from && trackedAddresses.includes(from);
                const isTrackedTo = to && trackedAddresses.includes(to);
                console.log(
                  "[Rugsense/inpage] eth_sendTransaction via fetch detected",
                  {
                    from,
                    to,
                    isTrackedFrom,
                    isTrackedTo
                  }
                );
                if (isTrackedFrom || isTrackedTo) {
                  post("Rugsense/ApproveDetected", {
                    title: "TRACKED ADDRESS RPC TRANSACTION",
                    body: `${isTrackedFrom ? "FROM" : "TO"} tracked address via RPC: ${from || to}`
                  });
                } else if (to) {
                  checkContractVerification(to).then((isVerified) => {
                    if (!isVerified) {
                      post("Rugsense/ApproveDetected", {
                        title: '<span style="display: inline-flex; align-items: center; gap: 4px; color: #f59e0b;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path></svg>UNVERIFIED CONTRACT RPC</span>',
                        body: `RPC call to UNVERIFIED contract!
Address: ${to}
<span style="display: inline-flex; align-items: center; gap: 4px; color: #f59e0b;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path></svg>Source code not available!</span>`
                      });
                    } else {
                      post("Rugsense/ApproveDetected", {
                        title: "RPC Transaction",
                        body: `RPC call to verified contract
Address: ${to}`
                      });
                    }
                  });
                } else {
                  post("Rugsense/ApproveDetected", {
                    title: "RPC Transaction",
                    body: "Transaction via RPC fetch request"
                  });
                }
              }
            } catch (e) {
            }
          }
        }
        return await originalFetch(...args);
      };
      const originalXHROpen = XMLHttpRequest.prototype.open;
      const originalXHRSend = XMLHttpRequest.prototype.send;
      XMLHttpRequest.prototype.open = function(method, url, async = true, username, password) {
        this._url = url.toString();
        return originalXHROpen.call(this, method, url, async, username, password);
      };
      XMLHttpRequest.prototype.send = function(data) {
        const url = this._url;
        if (url && (url.includes("eth_") || url.includes("rpc") || url.includes("infura") || url.includes("alchemy"))) {
          console.log(
            "[Rugsense/inpage] RPC request via XHR detected:",
            url,
            data
          );
          if (data && typeof data === "string") {
            try {
              const body = JSON.parse(data);
              if (body.method === "eth_sendTransaction" && body.params && body.params[0]) {
                const tx = body.params[0];
                const from = tx.from?.toLowerCase();
                const to = tx.to?.toLowerCase();
                const isTrackedFrom = from && trackedAddresses.includes(from);
                const isTrackedTo = to && trackedAddresses.includes(to);
                console.log(
                  "[Rugsense/inpage] eth_sendTransaction via XHR detected",
                  {
                    from,
                    to,
                    isTrackedFrom,
                    isTrackedTo
                  }
                );
                if (isTrackedFrom || isTrackedTo) {
                  post("Rugsense/ApproveDetected", {
                    title: "TRACKED ADDRESS RPC TRANSACTION",
                    body: `${isTrackedFrom ? "FROM" : "TO"} tracked address via XHR: ${from || to}`
                  });
                } else {
                  post("Rugsense/ApproveDetected", {
                    title: "RPC Transaction",
                    body: "Transaction via RPC XHR request"
                  });
                }
              }
            } catch (e) {
            }
          }
        }
        return originalXHRSend.call(this, data);
      };
    }
    setupNetworkMonitoring();
    document.addEventListener("click", (e) => {
      const target = e.target;
      if (target.tagName === "BUTTON") {
        const buttonText = target.textContent?.toLowerCase() || "";
        const buttonClass = target.className?.toLowerCase() || "";
        const buttonId = target.id?.toLowerCase() || "";
        if (buttonText.includes("transact") || buttonText.includes("send") || buttonText.includes("transfer") || buttonText.includes("run") || buttonText.includes("execute") || buttonText.includes("deploy") || buttonClass.includes("transact") || buttonClass.includes("send") || buttonClass.includes("transfer") || buttonClass.includes("run") || buttonClass.includes("execute") || buttonClass.includes("deploy") || buttonId.includes("transact") || buttonId.includes("send") || buttonId.includes("transfer") || buttonId.includes("run") || buttonId.includes("execute") || buttonId.includes("deploy")) {
          console.log("[Rugsense/inpage] Transaction button clicked:", {
            text: buttonText,
            class: buttonClass,
            id: buttonId
          });
          post("Rugsense/ApproveDetected", {
            title: "Transaction Button Clicked",
            body: `Button clicked: ${buttonText || buttonClass || buttonId}`
          });
        }
      }
    });
    setTimeout(() => {
      console.log("[Rugsense/inpage] DEBUG - Window objects:", {
        ethereum: !!window.ethereum,
        web3: !!window.web3,
        remix: !!window.remix,
        location: location.href,
        userAgent: navigator.userAgent,
        trackedAddresses
      });
      const allButtons = document.querySelectorAll("button");
      console.log("[Rugsense/inpage] DEBUG - Found buttons:", allButtons.length);
      allButtons.forEach((btn, i) => {
        if (i < 10) {
          console.log(`[Rugsense/inpage] Button ${i}:`, {
            text: btn.textContent,
            class: btn.className,
            id: btn.id,
            onclick: btn.onclick
          });
        }
      });
    }, 3e3);
    const interval = setInterval(scanAndHookAll, 500);
    const observer = new MutationObserver((mutations) => {
      setTimeout(scanAndHookAll, 100);
      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node;
              const transactionButtons = element.querySelectorAll?.(
                'button[class*="transact"], button[class*="send"], button[class*="transfer"], button[id*="transact"], button[id*="send"], button[id*="transfer"], button[class*="run"], button[class*="execute"], button[class*="deploy"], button[id*="run"], button[id*="execute"], button[id*="deploy"]'
              ) || [];
              transactionButtons.forEach((button) => {
                console.log(
                  "[Rugsense/inpage] Transaction button found:",
                  button
                );
                button.addEventListener("click", () => {
                  console.log("[Rugsense/inpage] Transaction button clicked");
                  post("Rugsense/ApproveDetected", {
                    title: "Transaction Button Clicked",
                    body: "Transaction button was clicked - review carefully"
                  });
                });
              });
            }
          });
        }
      });
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true
    });
    window.addEventListener(
      "eip6963:announceProvider",
      (event) => {
        const p = event?.detail?.provider;
        if (p) {
          console.log("[Rugsense/inpage] eip6963:announceProvider");
          hookProvider(p, "eip6963");
        }
      },
      { passive: true }
    );
    window.addEventListener("remix:transaction", (event) => {
      console.log("[Rugsense/inpage] Remix transaction event:", event.detail);
      post("Rugsense/ApproveDetected", {
        title: "Remix Transaction",
        body: "Transaction detected in Remix IDE"
      });
    });
    window.addEventListener("web3:transaction", (event) => {
      console.log("[Rugsense/inpage] Web3 transaction event:", event.detail);
      post("Rugsense/ApproveDetected", {
        title: "Web3 Transaction",
        body: "Transaction detected via Web3"
      });
    });
    const originalAddEventListener = window.addEventListener;
    window.addEventListener = function(type, listener, options) {
      if (type.includes("transaction") || type.includes("send") || type.includes("transfer")) {
        console.log(
          "[Rugsense/inpage] DEBUG - Window event listener added:",
          type
        );
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
    window.addEventListener("beforeunload", () => {
      clearInterval(interval);
      observer.disconnect();
    });
  })();
})();
