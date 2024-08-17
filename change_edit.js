// Element references
const submitButton = document.getElementById("submit_button");
const returnPeriodSelect = document.getElementById("return_period");
const confirmButton = document.getElementById("confirm_button");
const itemStatusDisplay = document.getElementById("item_status");

// Disable the submit button initially
submitButton.disabled = true;

// Disable the confirm return button initially
confirmButton.disabled = true;

// Fetch data from the server
async function fetchData(endpoint, options = {}) {
    try {
        const response = await fetch(endpoint, options);
        if (!response.ok) throw new Error(`Server error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error(`Fetch error: ${error.message}`);
        alert("An error occurred while fetching data from the server.");
        return null;
    }
}

// Validate return period against borrow period
function validateReturnPeriod(borrowPeriod) {
    returnPeriodSelect.addEventListener("change", function () {
        confirmButton.disabled = returnPeriodSelect.value !== borrowPeriod;
    });
}

// Check item availability and update the UI
async function checkItemAvailability(itemID) {
    const data = await fetchData(`/check_availability?itemID=${itemID}`);
    if (data) {
        itemStatusDisplay.textContent = data.isAvailable ? "Item is available" : "Item is not available";
        submitButton.disabled = !data.isAvailable;
    }
}

// Submit form data
async function submitForm(formData) {
    const options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
    };
    const response = await fetchData("/submit_form", options);
    if (response) {
        alert("Form submitted successfully!");
    }
}

// Handle form submission
submitButton.addEventListener("click", function () {
    const formData = {
        itemID: document.getElementById("item_id").value,
        returnPeriod: returnPeriodSelect.value,
        // Add other form data as necessary
    };
    submitForm(formData);
});

// Initialize page with item availability check
window.addEventListener("DOMContentLoaded", function () {
    const itemID = document.getElementById("item_id").value;
    checkItemAvailability(itemID);

    const borrowPeriod = "Some pre-filled value"; // Replace this with the actual borrow period
    validateReturnPeriod(borrowPeriod);
});
