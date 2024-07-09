document.addEventListener('DOMContentLoaded', () => {
    const ordersList = document.getElementById('orders-list');
    const adminOrdersList = document.getElementById('admin-orders-list');
    const orderReadyOverlay = document.getElementById('order-ready-overlay');
    const orderReadyContent = document.getElementById('order-ready-content');
    const videoContainer = document.getElementById('video-container');
    const lastOrderNumberDisplay = document.getElementById('last-order-number');
    const adminForm = document.getElementById('admin-form');
    const refreshOrdersBtn = document.getElementById('refresh-orders');
    
    const db = firebase.firestore();
    const ordersRef = db.collection('HickoryOrders');
    
    let orderNumber = 1;

    function saveOrders(order) {
        ordersRef.add(order);
    }

    function updateOrder(id, updateData) {
        ordersRef.doc(id).update(updateData);
    }

    function deleteOrder(id) {
        ordersRef.doc(id).delete();
    }

    function renderOrders() {
        ordersRef.onSnapshot(snapshot => {
            const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const ordersInProgress = orders.filter(order => order.status === 'preparing');
            const completedOrders = orders.filter(order => order.status === 'ready');
            
            if (ordersList) {
                ordersList.innerHTML = '';
            }
            if (adminOrdersList) {
                adminOrdersList.innerHTML = '';
            }

            const appendOrder = (order, container) => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <div class="order-number">#${String(order.number).padStart(3, '0')}</div>
                    <div class="order-time">${order.status === 'preparing' ? `${order.timeLeft} min` : 'Ready'}</div>
                    <div class="order-status">${order.status}</div>
                    <div class="order-actions">
                        <button class="checkmark" onclick="toggleOrderStatus('${order.id}', '${order.status}', event)">✔️</button>
                        <button class="pencil" onclick="editOrder('${order.id}', ${order.number}, event)">✏️</button>
                    </div>
                `;
                li.className = order.status;
                container.appendChild(li);
            };

            // Append completed orders first
            completedOrders.forEach(order => {
                if (ordersList) appendOrder(order, ordersList);
                if (adminOrdersList) appendOrder(order, adminOrdersList);
            });

            // Append in-progress orders
            ordersInProgress.forEach(order => {
                if (ordersList) appendOrder(order, ordersList);
                if (adminOrdersList) appendOrder(order, adminOrdersList);
            });

            // Update the last order number display
            if (lastOrderNumberDisplay) {
                lastOrderNumberDisplay.textContent = orderNumber - 1;
            }

            // Scroll to the first order
            if (ordersList) {
                ordersList.scrollTo(0, 0);
            }
        });
    }

    function addOrder(timeLeft) {
        const order = { number: orderNumber++, timeLeft, status: 'preparing' };
        saveOrders(order);
    }

    window.toggleOrderStatus = function (id, currentStatus, event) {
        event.stopPropagation();
        const newStatus = currentStatus === 'preparing' ? 'ready' : 'finished';
        if (newStatus === 'finished') {
            deleteOrder(id);
        } else {
            updateOrder(id, { status: newStatus });
            if (newStatus === 'ready') {
                showOrderReady(id);
            }
        }
    }

    window.showOrderReady = function (orderNumber) {
        if (videoContainer) {
            videoContainer.classList.add('blur');
        }
        if (orderReadyContent) {
            orderReadyContent.textContent = `Order #${String(orderNumber).padStart(3, '0')} is Ready!`;
        }
        if (orderReadyOverlay) {
            orderReadyOverlay.style.display = 'flex';
        }
    }

    window.hideOrderReadyOverlay = function () {
        if (orderReadyOverlay) {
            orderReadyOverlay.style.display = 'none';
        }
        if (videoContainer) {
            videoContainer.classList.remove('blur');
        }
    }

    window.editOrder = function (id, orderNumber, event) {
        event.stopPropagation();  // Prevent triggering complete or remove on edit click
        const newTime = prompt('Enter new time in minutes (leave empty to cancel):');
        if (newTime !== null && newTime !== '') {
            const parsedTime = parseInt(newTime);
            if (!isNaN(parsedTime)) {
                updateOrder(id, { timeLeft: parsedTime, status: 'preparing' });
            } else {
                alert('Invalid time entered.');
            }
        }
    }

    if (adminForm) {
        adminForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const entry = document.getElementById('entry').value;
            if (entry) {
                addOrder(parseInt(entry));
                document.getElementById('entry').value = '';
            }
        });
    }

    if (refreshOrdersBtn) {
        refreshOrdersBtn.addEventListener('click', () => {
            renderOrders();
        });
    }

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            hideOrderReadyOverlay();
        } else if (event.key === 'Enter' && event.target.tagName !== 'INPUT' && event.target.tagName !== 'TEXTAREA') {
            addOrder();
        }
    });

    if (orderReadyOverlay) {
        orderReadyOverlay.addEventListener('click', hideOrderReadyOverlay);
    }

    renderOrders();
});
