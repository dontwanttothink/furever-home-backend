const signInButton = document.getElementById("sign-in");
const signOutButton = document.getElementById("sign-out");
const signUpButton = document.getElementById("sign-up");
const viewPetsButton = document.getElementById("view-pets");

if (!signInButton || !signOutButton || !signUpButton || !viewPetsButton) {
	throw new Error("One or more buttons are missing");
}

signInButton.addEventListener("click", () => {
	const signInDialog = document.getElementById("sign-in-dialog");
	if (!signInDialog || !(signInDialog instanceof HTMLDialogElement)) {
		throw new Error("Sign-in dialog is missing");
	}
	signInDialog.showModal();
});

const closeDialogButton = document.getElementById("close-dialog");
if (!closeDialogButton) {
	throw new Error("Close dialog button is missing");
}
closeDialogButton.addEventListener("click", () => {
	const signInDialog = document.getElementById("sign-in-dialog");
	if (!signInDialog || !(signInDialog instanceof HTMLDialogElement)) {
		throw new Error("Sign-in dialog is missing");
	}
	signInDialog.close();
});

const signInForm = document.getElementById("sign-in-form");
if (!signInForm || !(signInForm instanceof HTMLFormElement)) {
	throw new Error("Sign-in form is missing");
}
signInForm.addEventListener("submit", async (event) => {
	event.preventDefault();

	const formData = new FormData(signInForm);
	const email = formData.get("email");
	const password = formData.get("password");

	console.log("Doing something");

	const response = await fetch("http://localhost:8080/sign-in", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ email, password }),
	});
	const data = await response.json();
	document.body.appendChild(document.createTextNode(JSON.stringify(data)));
});
