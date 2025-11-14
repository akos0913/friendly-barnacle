// HomeStyle Frontend JavaScript
class HomeStyleApp {
    constructor() {
        this.apiBase = 'http://localhost:5000/api/store/home';
        this.cart = [];
        this.products = [];
        this.init();
    }

    init() {
        this.loadFeaturedProducts();
        this.loadCart();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.searchProducts();
                }
            });
        }

        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }
    }

    async loadFeaturedProducts() {
        try {
            const response = await fetch(`${this.apiBase}/products/featured?limit=8`);
            if (!response.ok) throw new Error('Failed to load products');
            
            const products = await response.json();
            this.products = products;
            this.displayProducts(products);
        } catch (error) {
            console.error('Error loading products:', error);
            this.displayError('Failed to load products. Please try again later.');
        }
    }

    displayProducts(products) {
        const container = document.getElementById('featuredProducts');
        if (!container) return;

        if (products.length === 0) {
            container.innerHTML = '<div class="error">No products found.</div>';
            return;
        }

        container.innerHTML = products.map(product => `
            <div class="product-card" onclick="app.viewProduct('${product.id}')">
                <div class="product-image">
                    <i class="fas fa-home"></i>
                </div>
                <div class="product-info">
                    <h3 class="product-name">${this.escapeHtml(product.name)}</h3>
                    <div class="product-price">$${product.price}</div>
                    <button class="add-to-cart" onclick="event.stopPropagation(); app.addToCart('${product.id}')">
                        Add to Cart
                    </button>
                </div>
            </div>
        `).join('');
    }

    displayError(message) {
        const container = document.getElementById('featuredProducts');
        if (container) {
            container.innerHTML = `<div class="error">${this.escapeHtml(message)}</div>`;
        }
    }

    async searchProducts() {
        const searchInput = document.getElementById('searchInput');
        const query = searchInput.value.trim();
        
        if (!query) return;

        try {
            const response = await fetch(`${this.apiBase}/products/search?q=${encodeURIComponent(query)}`);
            if (!response.ok) throw new Error('Search failed');
            
            const data = await response.json();
            this.displayProducts(data.products);
            
            // Update section title
            const sectionTitle = document.querySelector('.section-title');
            if (sectionTitle) {
                sectionTitle.textContent = `Search Results for "${query}"`;
            }
        } catch (error) {
            console.error('Search error:', error);
            this.displayError('Search failed. Please try again.');
        }
    }

    filterByCategory(category) {
        // In a real implementation, this would filter products by category
        console.log('Filtering by category:', category);
        // For now, just show all products
        this.displayProducts(this.products);
    }

    viewProduct(productId) {
        // In a real implementation, this would navigate to product detail page
        console.log('Viewing product:', productId);
        alert('Product detail page coming soon!');
    }

    async addToCart(productId) {
        try {
            const response = await fetch(`${this.apiBase}/cart/items`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    productId: productId,
                    quantity: 1
                })
            });

            if (!response.ok) throw new Error('Failed to add to cart');
            
            const result = await response.json();
            this.showNotification('Added to your cart!', 'success');
            this.loadCart();
        } catch (error) {
            console.error('Add to cart error:', error);
            this.showNotification('Failed to add to cart', 'error');
        }
    }

    async loadCart() {
        try {
            const response = await fetch(`${this.apiBase}/cart/totals`);
            if (!response.ok) throw new Error('Failed to load cart');
            
            const data = await response.json();
            this.updateCartCount(data.total_items);
        } catch (error) {
            console.error('Load cart error:', error);
        }
    }

    updateCartCount(count) {
        const cartCount = document.getElementById('cartCount');
        if (cartCount) {
            cartCount.textContent = count;
            cartCount.style.display = count > 0 ? 'flex' : 'none';
        }
    }

    // Modal Management
    showLoginModal() {
        const modal = document.getElementById('loginModal');
        if (modal) {
            modal.classList.add('active');
        }
    }

    closeLoginModal() {
        const modal = document.getElementById('loginModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    showCartModal() {
        const modal = document.getElementById('cartModal');
        if (modal) {
            modal.classList.add('active');
            this.loadCartItems();
        }
    }

    closeCartModal() {
        const modal = document.getElementById('cartModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    async loadCartItems() {
        try {
            const response = await fetch(`${this.apiBase}/cart`);
            if (!response.ok) throw new Error('Failed to load cart items');
            
            const data = await response.json();
            this.displayCartItems(data);
        } catch (error) {
            console.error('Load cart items error:', error);
            document.getElementById('cartContent').innerHTML = 
                '<div class="error">Failed to load cart items.</div>';
        }
    }

    displayCartItems(data) {
        const container = document.getElementById('cartContent');
        if (!container) return;

        if (!data.items || data.items.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-secondary);">Your cart is empty</div>';
            return;
        }

        const total = data.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);

        container.innerHTML = `
            <div style="margin-bottom: 24px;">
                ${data.items.map(item => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px 0; border-bottom: 1px solid var(--border-color);">
                        <div>
                            <div style="font-weight: 600; font-size: 16px;">${this.escapeHtml(item.product_name || 'Product')}</div>
                            <div style="color: var(--text-secondary); margin-top: 4px;">Quantity: ${item.quantity}</div>
                        </div>
                        <div style="font-weight: 700; font-size: 18px;">$${(item.quantity * item.price).toFixed(2)}</div>
                    </div>
                `).join('')}
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 20px; font-weight: 700; margin-bottom: 24px; padding: 16px 0; border-top: 2px solid var(--primary-color);">
                <span>Total:</span>
                <span style="color: var(--primary-color);">$${total.toFixed(2)}</span>
            </div>
            <button style="width: 100%; padding: 16px; background: var(--success-color); color: white; border: none; border-radius: 12px; font-weight: 600; cursor: pointer; font-size: 16px;" onclick="app.checkout()">
                Proceed to Checkout
            </button>
        `;
    }

    async handleLogin() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('http://localhost:5000/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            if (!response.ok) throw new Error('Login failed');
            
            const data = await response.json();
            
            // Store authentication token
            localStorage.setItem('authToken', data.tokens.accessToken);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            this.showNotification('Welcome back!', 'success');
            this.closeLoginModal();
            
            // Update UI for logged-in user
            this.updateUserInterface(data.user);
        } catch (error) {
            console.error('Login error:', error);
            this.showNotification('Login failed. Please check your credentials.', 'error');
        }
    }

    updateUserInterface(user) {
        // Update header to show user is logged in
        const userBtn = document.querySelector('.action-btn');
        if (userBtn) {
            userBtn.innerHTML = `<i class="fas fa-user-check"></i>`;
        }
    }

    checkout() {
        // In a real implementation, this would redirect to checkout page
        console.log('Proceeding to checkout');
        alert('Checkout functionality coming soon!');
    }

    // Utility Methods
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 18px 28px;
            border-radius: 12px;
            color: white;
            font-weight: 600;
            z-index: 10000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
        `;

        // Set background color based on type
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            info: '#3b82f6',
            warning: '#f59e0b'
        };
        notification.style.backgroundColor = colors[type] || colors.info;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
}

// Initialize app
const app = new HomeStyleApp();

// Global functions for HTML onclick handlers
window.searchProducts = () => app.searchProducts();
window.filterByCategory = (category) => app.filterByCategory(category);
window.app = app;