const API_BASE = "https://alco-backend-yabe.onrender.com";

// Get driver info from login
const driverName = localStorage.getItem("driver_name");

// If driver is not logged in
if (!driverName) {
    alert("Driver not logged in.");
    window.location.href = "driver-login.html";
}

// ⭐ REMOVE THIS LINE (it breaks the page)
// document.getElementById("driverName").innerText = driverName;

async function loadDeliveries() {
    try {
        console.log("Fetching deliveries for:", driverName);

        // Correct backend route
        const res = await fetch(`${API_BASE}/api/deliveries/driver/${driverName}`);

        if (!res.ok) {
            throw new Error("Server returned " + res.status);
        }

        const deliveries = await res.json();
        console.log("Deliveries received:", deliveries);

        const list = document.getElementById("delivery_list");
        list.innerHTML = "";

        if (!Array.isArray(deliveries) || deliveries.length === 0) {
            list.innerHTML = `<div class="alert alert-info">No deliveries assigned.</div>`;
            return;
        }

        deliveries.forEach(d => {
            list.innerHTML += `
                <div class="delivery-card">
                    <h5 class="fw-bold">Order #${d.order_id}</h5>

                    <p><strong>Customer:</strong> ${d.customer_name}</p>
                    <p><strong>Address:</strong> ${d.address}</p>

                    <button class="btn btn-primary mt-3" onclick="openDelivery(${d.order_id})">
                        View Delivery Note
                    </button>
                </div>
            `;
        });

    } catch (err) {
        console.error("Error loading deliveries:", err);
        alert("Failed to load deliveries.");
    }
}

function openDelivery(orderId) {
    window.location.href = `deliveryNotes.html?id=${orderId}`;
}

document.addEventListener("DOMContentLoaded", loadDeliveries);
