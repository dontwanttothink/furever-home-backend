import { userDialog } from "./userDialog";

/**
 * User Modal
 */
const signInButton = document.getElementById("sign-in");
const signUpButton = document.getElementById("sign-up");

if (!signInButton || !signUpButton) {
	throw new Error("One or more user buttons are missing.");
}

signInButton.addEventListener("click", () => {
	userDialog.showSignIn();
});
signUpButton.addEventListener("click", () => {
	userDialog.showSignUp();
});

const signOutButton = document.getElementById("sign-out");
const viewPetsButton = document.getElementById("view-pets");

if (!signOutButton || !viewPetsButton) {
	throw new Error("One or more buttons are missing");
}
