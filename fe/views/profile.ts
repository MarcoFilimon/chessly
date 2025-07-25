import { appContent } from "../dom.js";
import { fetchProfile, updateProfile, sendVerificationEmail} from "../api.js";
import { Modal } from "../utils/general.js";
import {UserUpdate} from "../types.js"
import {setUserUsername, getUserUsername, getLastName, getFirstName} from '../state.js'

export async function renderViewUser(): Promise<void> {
    // Fetch user profile data from backend
    let profile;
    try {
        profile = await fetchProfile();
    } catch (error: any) {
        appContent.innerHTML = `<p class="text-red-600 text-center">Failed to load profile: ${error.message}</p>`;
        return;
    }

    appContent.innerHTML = `
        <div class="p-8 max-w-xl mx-auto bg-white rounded-lg shadow-lg">
            <h2 class="text-2xl font-bold mb-6 text-center">My Profile</h2>
            <form id="profileForm" class="space-y-4">
                <div>
                    <label class="block text-gray-700 font-semibold mb-1" for="username">Username</label>
                    <input id="username" type="text" class="w-full px-3 py-2 border rounded" value="${profile.username || ""}">
                </div>
                <div>
                    <label class="block text-gray-700 font-semibold mb-1" for="password">Password</label>
                    <input id="password" type="password" class="w-full px-3 py-2 border rounded">
                </div>
                <div>
                    <label class="block text-gray-700 font-semibold mb-1" for="confirmPassword">Confirm Password</label>
                    <input id="confirmPassword" type="password" class="w-full px-3 py-2 border rounded">
                </div>
                <div>
                    <label class="block text-gray-700 font-semibold mb-1" for="firstName">First Name</label>
                    <input id="firstName" type="text" class="w-full px-3 py-2 border rounded" value="${profile.first_name || ""}">
                </div>
                <div>
                    <label class="block text-gray-700 font-semibold mb-1" for="lastName">Last Name</label>
                    <input id="lastName" type="text" class="w-full px-3 py-2 border rounded" value="${profile.last_name || ""}">
                </div>
                <div>
                    <label class="block text-gray-700 font-semibold mb-1">Email</label>
                    <span class="inline-block px-2 py-1 bg-gray-100 rounded">${profile.email || ""}</span>
                    ${
                        profile.is_verified
                        ? `<span title="Verified" class="ml-2 text-green-600 align-middle" style="font-size: 2rem;">
                            &#10003;
                           </span>`
                        : `<button id="sendVerificationBtn" type="button" class="ml-2 text-blue-600 underline">Send verification email</button>`
                    }
                </div>
                <div class="flex justify-end">
                    <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded shadow">Save</button>
                </div>
            </form>
        </div>
    `;

    // Handle profile update
    document.getElementById("profileForm")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const username = (document.getElementById("username") as HTMLInputElement).value.trim();
        const first_name = (document.getElementById("firstName") as HTMLInputElement).value.trim();
        const last_name = (document.getElementById("lastName") as HTMLInputElement).value.trim();
        const password = (document.getElementById("password") as HTMLInputElement).value;
        const confirmPassword = (document.getElementById("confirmPassword") as HTMLInputElement).value;

        // Password validation
        if (password || confirmPassword) {
            if (password !== confirmPassword) {
                Modal.show("Passwords don't match.");
                return;
            }
            if (password.length < 3) {
                Modal.show("Password must be at least 3 characters.");
                return;
            }
        }

        // Build update object
        const newUserData: UserUpdate = {
            username,
            first_name,
            last_name
        };
        if (password) {
            newUserData.password = password;
        }
        if (
            newUserData.username === getUserUsername() &&
            newUserData.first_name === getFirstName() &&
            newUserData.last_name === getLastName() &&
            !password
        ) {
            Modal.show("No changes to update.");
            return;
        }
        try {
            const updatedUser = await updateProfile(newUserData);
            Modal.show("Profile updated successfully!");
            setUserUsername(updatedUser.username);
            localStorage.setItem('chessTournamentUsername', updatedUser.username);
            renderViewUser();
        } catch (error: any) {
            Modal.show("Failed to update profile: " + error.message);
        }
    });

    // Handle send verification email
    document.getElementById("sendVerificationBtn")?.addEventListener("click", async () => {
        try {
            await sendVerificationEmail();
            Modal.show("Verification email sent!");
        } catch (error: any) {
            Modal.show("Failed to send verification email: " + error.message);
        }
    });
}