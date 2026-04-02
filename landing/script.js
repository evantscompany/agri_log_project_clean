// Mobile Menu Toggle
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const navMenu = document.getElementById('navMenu');

mobileMenuBtn.addEventListener('click', () => {
    navMenu.classList.toggle('active');
    mobileMenuBtn.classList.toggle('active');
});

// Smooth Scrolling
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
            // Close mobile menu if open
            navMenu.classList.remove('active');
        }
    });
});

// Navbar Scroll Effect
let lastScroll = 0;
const navbar = document.querySelector('.navbar');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 100) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
    
    lastScroll = currentScroll;
});

// Active Navigation Link
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-link');

window.addEventListener('scroll', () => {
    let current = '';
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (pageYOffset >= (sectionTop - 200)) {
            current = section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
});

// Start App Button - Redirect to Dashboard
const startAppBtn = document.getElementById('startAppBtn');

startAppBtn.addEventListener('click', () => {
    // Show loading state
    startAppBtn.innerHTML = '<span class="btn-icon">⏳</span> 로딩 중...';
    startAppBtn.style.pointerEvents = 'none';
    
    // Redirect to the main app (splash screen)
    setTimeout(() => {
        // Change this URL to your actual app URL
        // For local development: http://localhost:5173
        // For production: your deployed URL
        window.location.href = 'http://localhost:5173';
    }, 500);
});

// Intersection Observer for Animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe all cards and sections
document.querySelectorAll('.problem-card, .feature-card, .tech-category').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
});

// Hero Background Slideshow
let currentSlide = 0;
const slides = document.querySelectorAll('.hero-bg-slide');

function nextSlide() {
    slides[currentSlide].classList.remove('active');
    currentSlide = (currentSlide + 1) % slides.length;
    slides[currentSlide].classList.add('active');
}

// Change slide every 5 seconds
if (slides.length > 0) {
    setInterval(nextSlide, 5000);
}

// Counter Animation for Stats
const animateCounter = (element, target, duration = 2000) => {
    let start = 0;
    const increment = target / (duration / 16);
    
    const timer = setInterval(() => {
        start += increment;
        if (start >= target) {
            element.textContent = target;
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(start);
        }
    }, 16);
};

// Trigger counter animation when stats section is visible
const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target.classList.contains('animated')) {
            entry.target.classList.add('animated');
            // You can add counter animations here if needed
        }
    });
}, { threshold: 0.5 });

const heroStats = document.querySelector('.hero-stats');
if (heroStats) {
    statsObserver.observe(heroStats);
}

// Handle App Link in Navigation
document.querySelectorAll('a[href="#app"]').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const appSection = document.getElementById('app');
        if (appSection) {
            appSection.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

// Add loading animation
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
    }
    
    .btn-app.loading {
        animation: pulse 1.5s ease-in-out infinite;
    }
`;
document.head.appendChild(style);

// VIN Search Functionality
// 프로덕션 환경에서는 실제 API URL로 변경하세요
const API_BASE_URL = window.ENV?.API_URL || 'http://localhost:8000/api/v1';

const vinSearchInput = document.getElementById('vinSearchInput');
const vinSearchBtn = document.getElementById('vinSearchBtn');
const searchLoading = document.getElementById('searchLoading');

// Search button click handler
vinSearchBtn.addEventListener('click', async () => {
    const vin = vinSearchInput.value.trim();
    if (!vin) {
        showError('기대번호를 입력해주세요.');
        return;
    }
    await searchMachine(vin);
});

// Enter key handler
vinSearchInput.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
        const vin = vinSearchInput.value.trim();
        if (vin) {
            await searchMachine(vin);
        }
    }
});

// Search machine function
async function searchMachine(vin) {
    // Show loading
    searchLoading.style.display = 'block';

    try {
        // Fetch machine details
        const machineResponse = await fetch(`${API_BASE_URL}/machines/${vin}`);
        if (!machineResponse.ok) {
            throw new Error('농기계 정보를 찾을 수 없습니다.');
        }
        const machineData = await machineResponse.json();

        // Fetch maintenance records
        const historyResponse = await fetch(`${API_BASE_URL}/history/machine/${vin}`);
        const historyData = await historyResponse.json();

        // Fetch price prediction
        let priceData = null;
        try {
            const priceResponse = await fetch(`${API_BASE_URL}/price/predict`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    vin: vin,
                    working_hours: machineData.total_hours || 0
                })
            });
            if (priceResponse.ok) {
                priceData = await priceResponse.json();
            }
        } catch (e) {
            console.log('Price prediction not available');
        }

        // Display results
        displayResults(machineData, historyData, priceData);

    } catch (error) {
        showError(error.message || '데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
        searchLoading.style.display = 'none';
    }
}

// Display search results in Hero section
function displayResults(machine, history, price) {
    // Hide buttons and stats
    document.querySelector('.hero-buttons').style.display = 'none';
    document.querySelector('.hero-stats').style.display = 'none';
    
    // Show results
    const heroResults = document.getElementById('heroSearchResults');
    heroResults.style.display = 'grid';
    
    // Machine info
    document.getElementById('heroType').textContent = machine.기종 || machine.category || '-';
    document.getElementById('heroModel').textContent = machine.모델명 || machine.model || '-';
    document.getElementById('heroHours').textContent = machine.total_hours ? `${machine.total_hours}시간` : '-';
    
    // Price prediction
    if (price && price.predicted_price) {
        // API가 이미 만원 단위로 반환하므로 그대로 사용
        document.getElementById('heroPredictedPrice').textContent = 
            `${price.predicted_price.toLocaleString()}만원`;
        document.getElementById('heroConfidence').textContent = 
            price.confidence || '보통';
    } else {
        document.getElementById('heroPredictedPrice').textContent = '예측 불가';
        document.getElementById('heroConfidence').textContent = '-';
    }
    
    // Test data for maintenance (static)
    // Already set in HTML as test data
}

// Show error message
function showError(message) {
    alert('오류: ' + message);
    // Reset search
    vinSearchInput.value = '';
}

// Demo Tab Switching
const demoTabs = document.querySelectorAll('.demo-tab');
const demoContents = document.querySelectorAll('.demo-content');

demoTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const demoType = tab.getAttribute('data-demo');
        
        // Remove active class from all tabs and contents
        demoTabs.forEach(t => t.classList.remove('active'));
        demoContents.forEach(c => c.classList.remove('active'));
        
        // Add active class to clicked tab and corresponding content
        tab.classList.add('active');
        document.getElementById(`demo-${demoType}`).classList.add('active');
        
        // Restart animations
        restartDemoAnimations(demoType);
    });
});

// Restart demo animations
function restartDemoAnimations(demoType) {
    const content = document.getElementById(`demo-${demoType}`);
    
    if (demoType === 'search') {
        // Typing animation
        const demoInput = content.querySelector('.demo-input');
        const text = 'DC008524384';
        let index = 0;
        
        demoInput.value = '';
        const typingInterval = setInterval(() => {
            if (index < text.length) {
                demoInput.value += text[index];
                index++;
            } else {
                clearInterval(typingInterval);
            }
        }, 150);
    }
    
    // QR animation is handled by CSS
}

// Start initial animations when page loads
window.addEventListener('load', () => {
    // Start OCR demo animation
    restartDemoAnimations('ocr');
    
    // Start search demo typing animation
    setTimeout(() => {
        const searchDemo = document.getElementById('demo-search');
        if (searchDemo) {
            const demoInput = searchDemo.querySelector('.demo-input');
            const text = 'DC008524384';
            let index = 0;
            
            const typingInterval = setInterval(() => {
                if (index < text.length) {
                    demoInput.value += text[index];
                    index++;
                } else {
                    clearInterval(typingInterval);
                }
            }, 150);
        }
    }, 1000);
});

// Reset search functionality
function resetSearch() {
    document.querySelector('.hero-buttons').style.display = 'flex';
    document.querySelector('.hero-stats').style.display = 'flex';
    document.getElementById('heroSearchResults').style.display = 'none';
    vinSearchInput.value = '';
}

// Add reset button listener if exists
const resetBtn = document.getElementById('resetSearchBtn');
if (resetBtn) {
    resetBtn.addEventListener('click', resetSearch);
}

// Business Model Tab Switching
const bmTabs = document.querySelectorAll('.bm-tab');
const bmContents = document.querySelectorAll('.bm-content');

bmTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const bmType = tab.getAttribute('data-bm');
        
        // Remove active class from all tabs and contents
        bmTabs.forEach(t => t.classList.remove('active'));
        bmContents.forEach(c => c.classList.remove('active'));
        
        // Add active class to clicked tab and corresponding content
        tab.classList.add('active');
        document.getElementById(`bm-${bmType}`).classList.add('active');
    });
});

// Console welcome message
console.log('%c🚜 Agri Log', 'font-size: 24px; font-weight: bold; color: #10b981;');
console.log('%c농기계 스마트 관리 플랫폼에 오신 것을 환영합니다!', 'font-size: 14px; color: #374151;');
console.log('%cGitHub: https://github.com/your-repo', 'font-size: 12px; color: #6b7280;');
