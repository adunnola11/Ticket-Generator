// ====================================
// 1. MOBILE NAVIGATION
// ====================================

const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");

if (menuToggle && navLinks) {

    menuToggle.addEventListener("click", () => {

        const isOpen = navLinks.classList.toggle("active");

        menuToggle.setAttribute("aria-expanded", isOpen);

        menuToggle.setAttribute(
            "aria-label",
            isOpen ? "Close navigation menu" : "Open navigation menu"
        );
    });

    navLinks.querySelectorAll("a").forEach(link => {

        link.addEventListener("click", () => {

            navLinks.classList.remove("active");
            menuToggle.setAttribute("aria-expanded", "false");
        });
    });
}


// ====================================
// 2. SELECT PAGE ELEMENTS
// ====================================

const form = document.getElementById("ticketForm");

const fullName = document.getElementById("fullName");
const email = document.getElementById("email");
const phone = document.getElementById("phone");
const ticketType = document.getElementById("ticketType");
const avatar = document.getElementById("avatar");

const avatarPreview = document.getElementById("avatarPreview");

const ticketSection = document.getElementById("ticketSection");

const prices = {
    Regular: 5000,
    VIP: 10000,
    VVIP: 20000
};

const maxFileSize = 2 * 1024 * 1024;

const allowedTypes = [
    "image/png",
    "image/jpeg",
    "image/webp"
];

const STORAGE_KEY = "techSummitRegistrations";

let avatarPreviewURL = "";


// ====================================
// 3. FORM VALIDATION HELPERS
// ====================================

function showError(input, errorId, message) {

    document.getElementById(errorId).textContent = message;

    input.classList.toggle("invalid", Boolean(message));

    input.setAttribute(
        "aria-invalid",
        message ? "true" : "false"
    );
}

function clearErrors() {

    showError(fullName, "nameError", "");
    showError(email, "emailError", "");
    showError(phone, "phoneError", "");
    showError(ticketType, "ticketError", "");

    document.getElementById("avatarError").textContent = "";

    avatar.classList.remove("invalid");
    avatar.removeAttribute("aria-invalid");

    document.getElementById("formMessage").textContent = "";
}


// ====================================
// 4. AVATAR IMAGE PREVIEW
// ====================================

if (avatar) {

    avatar.addEventListener("change", () => {

        const file = avatar.files[0];

        document.getElementById("avatarError").textContent = "";

        avatarPreview.hidden = true;

        if (avatarPreviewURL) {

            URL.revokeObjectURL(avatarPreviewURL);
            avatarPreviewURL = "";
        }

        if (!file) return;

        if (!allowedTypes.includes(file.type)) {

            document.getElementById("avatarError").textContent =
                "Please upload a PNG, JPG or WEBP image.";

            avatar.value = "";
            return;
        }

        if (file.size > maxFileSize) {

            document.getElementById("avatarError").textContent =
                "Image must not exceed 2MB.";

            avatar.value = "";
            return;
        }

        avatarPreviewURL = URL.createObjectURL(file);

        avatarPreview.src = avatarPreviewURL;
        avatarPreview.hidden = false;
    });
}


// ====================================
// 5. COMPRESS AVATAR FOR STORAGE
// ====================================

function compressImage(file) {

    return new Promise((resolve, reject) => {

        const image = new Image();
        const objectURL = URL.createObjectURL(file);

        image.onload = () => {

            const canvas = document.createElement("canvas");

            const maxDimension = 400;

            const scale = Math.min(
                1,
                maxDimension / Math.max(image.width, image.height)
            );

            canvas.width = Math.round(image.width * scale);
            canvas.height = Math.round(image.height * scale);

            const context = canvas.getContext("2d");

            context.fillStyle = "#ffffff";
            context.fillRect(0, 0, canvas.width, canvas.height);

            context.drawImage(
                image,
                0,
                0,
                canvas.width,
                canvas.height
            );

            const imageData = canvas.toDataURL(
                "image/jpeg",
                0.75
            );

            URL.revokeObjectURL(objectURL);

            resolve(imageData);
        };

        image.onerror = () => {

            URL.revokeObjectURL(objectURL);

            reject(new Error("Unable to process this image."));
        };

        image.src = objectURL;
    });
}


// ====================================
// 6. GENERATE UNIQUE TICKET ID
// ====================================

function generateTicketID() {

    const randomID = crypto.randomUUID
        ? crypto.randomUUID().split("-")[0]
        : Math.random().toString(36).substring(2, 10);

    return "TECH-" + randomID.toUpperCase();
}


// ====================================
// 7. GENERATE QR CODE
// ====================================

function generateQRCode(attendee) {

    const qrContainer = document.getElementById("qrcode");

    if (!qrContainer || typeof QRCode === "undefined") {
        return;
    }

    qrContainer.innerHTML = "";

    const ticketInformation = JSON.stringify({

        event: "TechSummit 2026",
        name: attendee.name,
        ticketID: attendee.ticketID,
        ticketType: attendee.ticketType
    });

    new QRCode(qrContainer, {

        text: ticketInformation,
        width: 150,
        height: 150,
        correctLevel: QRCode.CorrectLevel.H
    });
}


// ====================================
// 8. DISPLAY GENERATED TICKET
// ====================================

function displayTicket(attendee) {

    if (!ticketSection) return;

    document.getElementById("displayName").textContent =
        attendee.name;

    document.getElementById("displayEmail").textContent =
        attendee.email;

    document.getElementById("displayType").textContent =
        attendee.ticketType;

    document.getElementById("displayId").textContent =
        attendee.ticketID;

    document.getElementById("displayPrice").textContent =
        new Intl.NumberFormat("en-NG", {

            style: "currency",
            currency: "NGN",
            maximumFractionDigits: 0

        }).format(prices[attendee.ticketType]);

    const displayAvatar = document.getElementById("displayAvatar");

    if (attendee.avatarData) {

        displayAvatar.src = attendee.avatarData;
        displayAvatar.hidden = false;

    } else {

        displayAvatar.hidden = true;
    }

    generateQRCode(attendee);

    ticketSection.hidden = false;
}


// ====================================
// 9. SAVE REGISTRATION TO LOCALSTORAGE
// ====================================

function saveRegistration(attendee) {

    let registrations = [];

    try {

        registrations = JSON.parse(
            localStorage.getItem(STORAGE_KEY) || "[]"
        );

        if (!Array.isArray(registrations)) {
            registrations = [];
        }

    } catch (error) {

        registrations = [];
    }

    registrations.push(attendee);

    registrations = registrations.slice(-20);

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(registrations)
    );
}


// ====================================
// 10. HANDLE REGISTRATION FORM
// ====================================

if (form) {

    form.addEventListener("submit", async (event) => {

        event.preventDefault();

        clearErrors();

        let isValid = true;

        // Validate name
        if (!fullName.value.trim()) {

            showError(
                fullName,
                "nameError",
                "Full name is required."
            );

            isValid = false;
        }

        // Validate email
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!email.value.trim()) {

            showError(email, "emailError", "Email is required.");

            isValid = false;

        } else if (!emailPattern.test(email.value.trim())) {

            showError(
                email,
                "emailError",
                "Enter a valid email address."
            );

            isValid = false;
        }

        // Validate phone
        const phonePattern = /^\+?[0-9\s()-]{7,20}$/;

        if (!phone.value.trim()) {

            showError(phone, "phoneError", "Phone number is required.");

            isValid = false;

        } else if (!phonePattern.test(phone.value.trim())) {

            showError(
                phone,
                "phoneError",
                "Enter a valid phone number."
            );

            isValid = false;
        }

        // Validate ticket type
        if (!ticketType.value) {

            showError(
                ticketType,
                "ticketError",
                "Please select a ticket type."
            );

            isValid = false;
        }

        // Validate avatar
        const file = avatar.files[0];

        if (file && !allowedTypes.includes(file.type)) {

            document.getElementById("avatarError").textContent =
                "Unsupported image format.";

            isValid = false;
        }

        if (file && file.size > maxFileSize) {

            document.getElementById("avatarError").textContent =
                "Image must not exceed 2MB.";

            isValid = false;
        }

        if (!isValid) {

            document.getElementById("formMessage").textContent =
                "Please correct the errors before continuing.";

            const firstInvalid = form.querySelector(".invalid");

            if (firstInvalid) {
                firstInvalid.focus();
            }

            return;
        }

        try {

            // Compress uploaded avatar
            let avatarData = "";

            if (file) {
                avatarData = await compressImage(file);
            }

            // Create attendee information
            const attendee = {

                name: fullName.value.trim(),
                email: email.value.trim(),
                phone: phone.value.trim(),

                ticketType: ticketType.value,

                price: prices[ticketType.value],

                ticketID: generateTicketID(),

                avatarData: avatarData,

                registrationDate: new Date().toISOString()
            };

            // Save registration once
            try {

                saveRegistration(attendee);

            } catch (storageError) {

                console.error("Storage error:", storageError);

                document.getElementById("formMessage").textContent =
                    "Unable to save your registration. Please try again.";

                return;
            }

            // Open the separate ticket page
            window.location.href = "ticket.html";

        } catch (error) {

            document.getElementById("formMessage").textContent =
                "Something went wrong. Please try again.";

            console.error(error);
        }
    });
}


// ====================================
// 11. RESTORE TICKET ON TICKET PAGE
// ====================================

if (ticketSection) {

    try {

        const registrations = JSON.parse(
            localStorage.getItem(STORAGE_KEY) || "[]"
        );

        const attendee = Array.isArray(registrations)
            ? registrations[registrations.length - 1]
            : null;

        if (
            attendee &&
            attendee.name &&
            attendee.ticketID &&
            prices[attendee.ticketType] !== undefined
        ) {

            displayTicket(attendee);

        } else {

            ticketSection.hidden = true;

            const noTicketMessage =
                document.getElementById("noTicketMessage");

            if (noTicketMessage) {
                noTicketMessage.hidden = false;
            }
        }

    } catch (error) {

        console.error("Unable to restore ticket:", error);

        ticketSection.hidden = true;

        const noTicketMessage =
            document.getElementById("noTicketMessage");

        if (noTicketMessage) {
            noTicketMessage.hidden = false;
        }
    }
}


// ====================================
// 12. DOWNLOAD TICKET AS PDF
// ====================================

const downloadButton = document.getElementById("downloadPDF");

if (downloadButton) {

    downloadButton.addEventListener("click", async () => {

        const status = document.getElementById("pdfStatus");

        downloadButton.disabled = true;
        downloadButton.textContent = "Preparing PDF...";

        status.textContent =
            "Please wait while your ticket is prepared.";

        try {

            const ticket = document.querySelector(".ticket-card");

            const canvas = await html2canvas(ticket, {

                scale: 2,
                backgroundColor: "#ffffff",
                useCORS: true
            });

            const imageData = canvas.toDataURL("image/png");

            const { jsPDF } = window.jspdf;

            const pdf = new jsPDF({

                orientation: "portrait",
                unit: "mm",
                format: "a4"
            });

            const pageWidth = 180;

            const pageHeight =
                (canvas.height * pageWidth) / canvas.width;

            const finalWidth = pageHeight > 270
                ? (270 * canvas.width) / canvas.height
                : pageWidth;

            const finalHeight = Math.min(pageHeight, 270);

            pdf.addImage(
                imageData,
                "PNG",
                (210 - finalWidth) / 2,
                15,
                finalWidth,
                finalHeight
            );

            const ticketID =
                document.getElementById("displayId").textContent;

            pdf.save(ticketID + "-ticket.pdf");

            status.textContent =
                "Your ticket PDF has been downloaded successfully.";

        } catch (error) {

            console.error(error);

            status.textContent =
                "Unable to download PDF. Please try again.";

        } finally {

            downloadButton.disabled = false;
            downloadButton.textContent = "Download PDF";
        }
    });
}


// ====================================
// 13. PRINT TICKET
// ====================================

const printButton = document.getElementById("printTicket");

if (printButton) {

    printButton.addEventListener("click", () => {

        window.print();
    });
}