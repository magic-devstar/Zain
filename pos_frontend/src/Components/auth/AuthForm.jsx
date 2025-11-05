import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  FaUser,
  FaLock,
  FaEnvelope,
  FaStore,
  FaMapMarkerAlt,
  FaCity,
  FaMailBulk,
  FaClock,
} from "react-icons/fa";
import AuthSlider from "./AuthSlider";
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';
const origin = import.meta.env.VITE_BACKEND_URL;
import { useDispatch } from 'react-redux';
import { setUserInfo } from '../../Redux/Slices/UserSlice';
import PhoneNumberInput from "../Common/PhoneNumberInput";
import PopupComponent from "../popups/PopupComponent";
import TermsOfUserPopup from "../popups/TermsOfUserPopup";
import ResetPasswordPopup from "../popups/ResetPasswordPopup";
import api from "../../utils/api";
import { getPreferredSoftwareOptions } from "../../api/platformConfig";


function AuthForm({ type }) {
  const [isLoading, setIsLoading] = useState(false);
  const [reseting, setReseting] = useState(false);
  const [popup, setPopup] = useState(false);
  const [popupName, setPopupName] = useState("");
  const [firstLoginRequired, setFirstLoginRequired] = useState(false);
  const [newPassword1, setNewPassword1] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [firstLoginSubmitting, setFirstLoginSubmitting] = useState(false);
  const [firstLoginTempAccess, setFirstLoginTempAccess] = useState("");
  const [pendingRole, setPendingRole] = useState("");
  const dispatch = useDispatch();

  // State to manage form inputs
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const navigate = useNavigate();
  // Form states for CustomerProfile
  const [storeName, setStoreName] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [storeCity, setStoreCity] = useState("");
  const [storeZipCode, setStoreZipCode] = useState("");
  const [storeBillingEmail, setStoreBillingEmail] = useState("");
  const [storePhone, setStorePhone] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [distributorName, setDistributorName] = useState("");
  const [distributorEmail, setDistributorEmail] = useState("");
  const [distributorPhone, setDistributorPhone] = useState("");
  const [managerName, setManagerName] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
  const [managerPhone, setManagerPhone] = useState("");
  const [openTime, setOpenTime] = useState("06:00");
  const [closeTime, setCloseTime] = useState("01:00");
  const [driverLicense, setDriverLicense] = useState(null);

  // State for preferred_software
  const [preferredSoftware, setPreferredSoftware] = useState({});
  const [softwareOptions, setSoftwareOptions] = useState([]);

  // Handle checkbox changes for preferred_software
  const handleSoftwareChange = (software) => {
    setPreferredSoftware((prev) => ({
      ...prev,
      [software]: !prev[software],
    }));
  };

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const options = await getPreferredSoftwareOptions();
        setSoftwareOptions(options);
        // Initialize state map if empty
        setPreferredSoftware((prev) => {
          if (Object.keys(prev || {}).length > 0) return prev;
          const init = {};
          (options || []).forEach((label) => {
            const key = label.replace(/ \(.*\)/, "");
            init[key] = false;
          });
          return init;
        });
      } catch (e) {
        // Fallback to existing hardcoded defaults if API fails
        const fallback = [
          "Standup",
          "Fish Table",
          "Frontier",
          "Stampede",
          "Golden Dragon (Kiosk and online only)",
          "Fire Dragon (Online)",
          "Fortune 2 Go (Online)",
          "Fortune",
          "Frontier 2.0",
          "River (Online)",
          "Kiosk (Physical Machine to play online games, Golden Dragon and Magic City Only)",
          "ATM",
        ];
        setSoftwareOptions(fallback);
        const init = {};
        fallback.forEach((label) => {
          const key = label.replace(/ \(.*\)/, "");
          init[key] = false;
        });
        setPreferredSoftware(init);
      }
    };
    fetchOptions();
  }, []);


  const roleToRouteMap = {
    Admin: '/admin/',
    Manager: '/manager/',
    'Warehouse Manager': '/warehouse-manager/',
    'Warehouse Technician': '/warehouse-technician/',
    'Vending Customer': '/vending-customer/',
    'Service Customer': '/service-customer/',
    Reporter: '/reporter/',
    Technician: '/technician/',
    'External User': '/external-user/',
    Partner: '/partner/',
    Employee: '/partner/',
    User: '/service-customer/',
    user: '/service-customer/',
  };


  const onSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const payload =
      type === "sign-in" && { email, password };

    try {
      if (type === "sign-in") {
        const response = await axios.post(`${origin}/auth/login/`, payload);
        const {
          access,
          refresh,
          role,
          must_change_password,
        } = response.data;

        if (must_change_password) {
          // Hold temporary access for first-login password update. Do NOT persist.
          setFirstLoginTempAccess(access);
          setPendingRole(role || "");
          setPopupName("First Login Password");
          setPopup(true);
          setFirstLoginRequired(true);
          return;
        }

        toast.success("Login Successful!");

        localStorage.setItem("access", access);
        localStorage.setItem("refresh", refresh);
        localStorage.setItem("userRole", role);
        
        // Dispatch the user info to Redux store
        dispatch(setUserInfo({ user: response.data }));

        const route = roleToRouteMap[role] || '/service-customer';
        navigate(route); // Redirect to the route
      } else {
        // All sign-up specific validations
        if (type === "sign-up") {
          if (phone.replace(/\D/g, "").length < 10) {
            toast.error("Please enter your valid Phone number.");
            setIsLoading(false);
            return;
          }
          if (managerPhone.replace(/\D/g, "").length < 10) {
            toast.error("Please enter a valid Manager Phone number.");
            setIsLoading(false);
            return;
          }
          if (ownerPhone.replace(/\D/g, "").length < 10) {
            toast.error("Please enter a valid Owner Phone number.");
            setIsLoading(false);
            return;
          }
          if (storePhone.replace(/\D/g, "").length < 10) {
            toast.error("Please enter a valid Store Phone number.");
            setIsLoading(false);
            return;
          }

          if (!Object.values(preferredSoftware).some(value => value)) {
            toast.error("Please select at least one preferred software option.");
            setIsLoading(false);
            return;
          }

        }
        // Create FormData for file upload
        const formData = new FormData();

        // Append all the form fields
        formData.append('username', `${firstName} ${lastName}`);
        formData.append('email', email);
        formData.append('password', password);
        formData.append('phone_number', phone);
        formData.append('store_name', storeName);
        formData.append('store_address', storeAddress);
        formData.append('store_city', storeCity);
        formData.append('store_zip_code', storeZipCode);
        formData.append('store_billing_email', storeBillingEmail);
        formData.append('store_phone', storePhone);
        formData.append('owner_name', ownerName);
        formData.append('owner_email', ownerEmail);
        formData.append('owner_phone', ownerPhone);
        formData.append('distributor_name', distributorName);
        formData.append('distributor_email', distributorEmail);
        formData.append('distributor_phone', distributorPhone);
        formData.append('manager_name', managerName);
        formData.append('manager_email', managerEmail);
        formData.append('manager_phone', managerPhone);
        formData.append('open_time', openTime);
        formData.append('close_time', closeTime);

        // Append the preferred_software as JSON string
        formData.append('preferred_software', JSON.stringify(preferredSoftware));

        // Append the driver license file if it exists
        if (driverLicense) {
          formData.append('driver_license', driverLicense);
        }

        const response = await axios.post(`${origin}/auth/register/`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        toast.success("Success, Our representative will contact with you Soon !");
        navigate("/login");
      }
    } catch (error) {
      if (type === "sign-in") {
        const backendErrorMessage = error.response?.data?.detail;

        if (backendErrorMessage) {
          toast.error(backendErrorMessage);
        } else {
          toast.error("Invalid Credentials!");
        }
      } else {
        // For sign-up errors
        const errorData = error.response?.data;
        const backendErrorMessage = errorData?.error || errorData?.detail;
        
        if (backendErrorMessage) {
          // If it's an object (like validation errors), show it properly
          if (typeof backendErrorMessage === 'object') {
            const errorText = JSON.stringify(backendErrorMessage);
            toast.error(`Registration failed: ${errorText}`);
          } else {
            toast.error(backendErrorMessage);
          }
        } else if (errorData && typeof errorData === 'object') {
          // Try to extract field-specific errors
          const errorMessages = Object.entries(errorData)
            .map(([key, value]) => {
              if (Array.isArray(value)) {
                return `${key}: ${value.join(', ')}`;
              }
              return `${key}: ${value}`;
            })
            .join('; ');
          if (errorMessages) {
            toast.error(`Registration failed: ${errorMessages}`);
          } else {
            toast.error("Registration failed. Please try again!");
          }
        } else {
          toast.error("Registration failed. Please try again!");
        }
      }
      console.error("Registration Error:", error.response?.data || error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (response) => {
    if (response.credential) {
      setIsLoading(true);
      try {
        // Prepare the payload dynamically based on sign-in or sign-up
        const payload = {
          token: response.credential,
          login_type: type === "sign-in" ? 'login' : 'signup',
        };


        // Make the API call
        const googleResponse = await axios.post(`${origin}/auth/google-login/`, payload);

        if (googleResponse.status === 200) {
          // Save user session data to local storage
          localStorage.setItem('access', googleResponse.data.token);
          localStorage.setItem("refresh", googleResponse.data.refresh);
          localStorage.setItem("userRole", googleResponse.data.role);
          dispatch(setUserInfo({ user: googleResponse.data }));


          toast.success("Login Successfull!");

          const route = roleToRouteMap[googleResponse.data.role] || '/service-customer';
          navigate(route); // Redirect to the route
        } else {
          alert('Google Login failed');
        }
      } catch (err) {
        // Check if the error response status is 400
        if (err.response && err.response.status === 400) {
          console.error('Bad Request, redirecting to signup...');
          toast.success("Signup First !");
          // Redirect to the signup page
          navigate('/sign-up'); // Replace with your signup route
        } else {
          console.error('There was an error logging in with Google!', err);
          toast.error('Login with Google Failed!');
        }
      } finally {
        setIsLoading(false);
      }
    }
  };


  const handleGoogleFailure = () => {
    console.error('Google OAuth Failed');
    toast.error('Google login failed.');
  };



  const handleTermsClick = () => {
    setPopupName("Terms");
    setPopup(true);
  };

  const handleRoleChange = (selectedRole) => {
    setRole(selectedRole);
  };

  const handleResetClick = () => {
    setPopupName("Reset Password");
    setPopup(true);
  };

  const handleResetPassword = async (email) => {
    setReseting(true);
    try {
      const response = await api.post("/auth/forgot-password/", { email });
      toast.success(response.data.message || "Reset Link Sent!");
      setPopup(false);
    } catch (error) {
      console.error("Reset failed:", error);
      const backendMsg =
        error.response?.data?.detail || error.response?.data?.message || "Failed to send reset link.";
      toast.error(backendMsg);
    } finally {
      setReseting(false);
    }
  };

  const handleFirstLoginPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword1 || !newPassword2) {
      toast.error("Please enter and confirm your new password.");
      return;
    }
    if (newPassword1 !== newPassword2) {
      toast.error("Passwords do not match.");
      return;
    }

    try {
      setFirstLoginSubmitting(true);
      const token = firstLoginTempAccess;
      const resp = await axios.post(
        `${origin}/auth/first-login/set-password/`,
        { new_password1: newPassword1, new_password2: newPassword2 },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Persist new tokens and user info from response
      localStorage.setItem('access', resp.data.token);
      localStorage.setItem('refresh', resp.data.refresh);
      localStorage.setItem('userRole', resp.data.role || pendingRole);
      dispatch(setUserInfo({ user: resp.data }));

      toast.success("Password updated successfully.");
      setPopup(false);
      setFirstLoginRequired(false);
      setNewPassword1("");
      setNewPassword2("");
      setFirstLoginTempAccess("");

      const finalRole = resp.data.role || pendingRole;
      const route = roleToRouteMap[finalRole] || '/service-customer';
      navigate(route);
    } catch (error) {
      const backendMsg =
        error.response?.data?.detail || error.response?.data?.password?.[0] || "Failed to update password.";
      toast.error(backendMsg);
    } finally {
      setFirstLoginSubmitting(false);
    }
  };


  // softwareOptions now comes from API

  return (
    <section
      className={`flex flex-col md:flex-row lg:gap-10 min-h-screen w-full bg-white rounded-lg ${type === "sign-in" ? "justify-center" : ""
        } relative`}
    >
      {type !== "sign-in" && (
        <header className="hidden md:block md:w-1/2 sticky h-screen top-0">
          <AuthSlider />
        </header>
      )}

      <form
        onSubmit={onSubmit}
        className={`md:flex-1 flex flex-col justify-center rounded-lg ${type === "sign-in" ? "max-w-md w-[95%] sm:w-full h-[fit-content] m-auto border-2 border-black-400 shadow-lg px-6 py-6 md:px-16 md:py-6" : " p-4 md:p-6"
          }`}
      >
        <div className="text-center flex items-center gap-3 flex-col mb-4">
          <h1 className="text-2xl font-semibold">
            {type === "sign-in" ? (
              <>
                Login to <img src="/assets/images/logo.png" alt="Login Icon" className="h-10 inline-block" />
              </>
            ) : (
              <>
                Register on <img src="/assets/images/logo.png" alt="Register Icon" className="h-10 inline-block" />
              </>
            )}
          </h1>
          <p className="text-gray-600 w-full lg:w-2/3">
            {type === "sign-in"
              ? "Enter your login credentials to start using your Account!"
              : "Enter the details to let us know about you!"}
          </p>
        </div>
        {type === "sign-in" && (
          <button type="button" className="mb-4 flex items-center justify-center">
            <GoogleLogin onSuccess={handleGoogleSuccess} onError={handleGoogleFailure} />
          </button>
        )}

        <div className="space-y-6">
          {type === "sign-up" && (
            <>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-1/2">
                  <label className="block text-sm font-medium mb-1" htmlFor="firstName">
                    First Name
                  </label>
                  <div className="flex items-center w-full border px-4 border-gray-300 rounded-md shadow-sm focus-within:ring-2 focus-within:ring-primary">
                    <FaUser className="mr-2 text-primary" />
                    <input
                      id="firstName"
                      type="text"
                      placeholder="First Name"
                      className="w-full px-4 py-2 focus:outline-none"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <div className="w-full md:w-1/2">
                  <label className="block text-sm font-medium mb-1" htmlFor="lastName">
                    Last Name
                  </label>
                  <div className="flex items-center w-full border px-4 border-gray-300 rounded-md shadow-sm focus-within:ring-2 focus-within:ring-primary">
                    <FaUser className="mr-2 text-primary" />
                    <input
                      id="lastName"
                      type="text"
                      placeholder="Last Name"
                      className="w-full px-4 py-2 focus:outline-none"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="phone">
                  Phone Number
                </label>
                <PhoneNumberInput
                  value={phone}
                  onPhoneChange={(phone) => setPhone(phone)}
                  disabled={isLoading}
                />
              </div>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-1/2">
                  <label className="block text-sm font-medium mb-1" htmlFor="storeName">
                    Store Name
                  </label>
                  <div className="flex items-center w-full border px-4 border-gray-300 rounded-md shadow-sm focus-within:ring-2 focus-within:ring-primary">
                    <FaStore className="mr-2 text-primary" />
                    <input
                      id="storeName"
                      type="text"
                      placeholder="Store Name"
                      className="w-full px-4 py-2 focus:outline-none"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="w-full md:w-1/2">
                  <label className="block text-sm font-medium mb-1" htmlFor="storeAddress">
                    Store Address
                  </label>
                  <div className="flex items-center w-full border px-4 border-gray-300 rounded-md shadow-sm focus-within:ring-2 focus-within:ring-primary">
                    <FaMapMarkerAlt className="mr-2 text-primary" />
                    <input
                      id="storeAddress"
                      type="text"
                      placeholder="Store Address"
                      className="w-full px-4 py-2 focus:outline-none"
                      value={storeAddress}
                      onChange={(e) => setStoreAddress(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-1/2">
                  <label className="block text-sm font-medium mb-1" htmlFor="storeCity">
                    Store City
                  </label>
                  <div className="flex items-center w-full border px-4 border-gray-300 rounded-md shadow-sm focus-within:ring-2 focus-within:ring-primary">
                    <FaCity className="mr-2 text-primary" />
                    <input
                      id="storeCity"
                      type="text"
                      placeholder="Store City"
                      className="w-full px-4 py-2 focus:outline-none"
                      value={storeCity}
                      onChange={(e) => setStoreCity(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="w-full md:w-1/2">
                  <label className="block text-sm font-medium mb-1" htmlFor="storeZipCode">
                    Store Zip Code
                  </label>
                  <div className="flex items-center w-full border px-4 border-gray-300 rounded-md shadow-sm focus-within:ring-2 focus-within:ring-primary">
                    <FaMailBulk className="mr-2 text-primary" />
                    <input
                      id="storeZipCode"
                      type="text"
                      placeholder="Store Zip Code"
                      className="w-full px-4 py-2 focus:outline-none"
                      value={storeZipCode}
                      onChange={(e) => setStoreZipCode(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-1/2">
                  <label className="block text-sm font-medium mb-1" htmlFor="storeBillingEmail">
                    Store Billing Email
                  </label>
                  <div className="flex items-center w-full border px-4 border-gray-300 rounded-md shadow-sm focus-within:ring-2 focus-within:ring-primary">
                    <FaEnvelope className="mr-2 text-primary" />
                    <input
                      id="storeBillingEmail"
                      type="email"
                      placeholder="Store Billing Email"
                      className="w-full px-4 py-2 focus:outline-none"
                      value={storeBillingEmail}
                      onChange={(e) => setStoreBillingEmail(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="w-full md:w-1/2">
                  <label className="block text-sm font-medium mb-1" htmlFor="storePhone">
                    Store Phone
                  </label>
                  <PhoneNumberInput
                    value={storePhone}
                    onPhoneChange={(phone) => setStorePhone(phone)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-1/2">
                  <label className="block text-sm font-medium mb-1" htmlFor="ownerName">
                    Owner Name
                  </label>
                  <div className="flex items-center w-full border px-4 border-gray-300 rounded-md shadow-sm focus-within:ring-2 focus-within:ring-primary">
                    <FaUser className="mr-2 text-primary" />
                    <input
                      id="ownerName"
                      type="text"
                      placeholder="Owner Name"
                      className="w-full px-4 py-2 focus:outline-none"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="w-full md:w-1/2">
                  <label className="block text-sm font-medium mb-1" htmlFor="ownerEmail">
                    Owner Email
                  </label>
                  <div className="flex items-center w-full border px-4 border-gray-300 rounded-md shadow-sm focus-within:ring-2 focus-within:ring-primary">
                    <FaEnvelope className="mr-2 text-primary" />
                    <input
                      id="ownerEmail"
                      type="email"
                      placeholder="Owner Email"
                      className="w-full px-4 py-2 focus:outline-none"
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="ownerPhone">
                  Owner Phone
                </label>
                <PhoneNumberInput
                  value={ownerPhone}
                  onPhoneChange={(phone) => setOwnerPhone(phone)}
                  disabled={isLoading}
                />
              </div>

              <div className="flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-1/2">
                  <label className="block text-sm font-medium mb-1" htmlFor="distributorName">
                    Distributor Name
                  </label>
                  <div className="flex items-center w-full border px-4 border-gray-300 rounded-md shadow-sm focus-within:ring-2 focus-within:ring-primary">
                    <FaUser className="mr-2 text-primary" />
                    <input
                      id="distributorName"
                      type="text"
                      placeholder="Distributor Name"
                      className="w-full px-4 py-2 focus:outline-none"
                      value={distributorName}
                      onChange={(e) => setDistributorName(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="w-full md:w-1/2">
                  <label className="block text-sm font-medium mb-1" htmlFor="distributorEmail">
                    Distributor Email
                  </label>
                  <div className="flex items-center w-full border px-4 border-gray-300 rounded-md shadow-sm focus-within:ring-2 focus-within:ring-primary">
                    <FaEnvelope className="mr-2 text-primary" />
                    <input
                      id="distributorEmail"
                      type="email"
                      placeholder="Distributor Email"
                      className="w-full px-4 py-2 focus:outline-none"
                      value={distributorEmail}
                      onChange={(e) => setDistributorEmail(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="distributorPhone">
                  Distributor Phone
                </label>
                <PhoneNumberInput
                  value={distributorPhone}
                  onPhoneChange={(phone) => setDistributorPhone(phone)}
                  disabled={isLoading}
                />
              </div>

              <div className="flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-1/2">
                  <label className="block text-sm font-medium mb-1" htmlFor="managerName">
                    Manager Name
                  </label>
                  <div className="flex items-center w-full border px-4 border-gray-300 rounded-md shadow-sm focus-within:ring-2 focus-within:ring-primary">
                    <FaUser className="mr-2 text-primary" />
                    <input
                      id="managerName"
                      type="text"
                      placeholder="Manager Name"
                      className="w-full px-4 py-2 focus:outline-none"
                      value={managerName}
                      onChange={(e) => setManagerName(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="w-full md:w-1/2">
                  <label className="block text-sm font-medium mb-1" htmlFor="managerEmail">
                    Manager Email
                  </label>
                  <div className="flex items-center w-full border px-4 border-gray-300 rounded-md shadow-sm focus-within:ring-2 focus-within:ring-primary">
                    <FaEnvelope className="mr-2 text-primary" />
                    <input
                      id="managerEmail"
                      type="email"
                      placeholder="Manager Email"
                      className="w-full px-4 py-2 focus:outline-none"
                      value={managerEmail}
                      onChange={(e) => setManagerEmail(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="managerPhone">
                  Manager Phone
                </label>
                <PhoneNumberInput
                  value={managerPhone}
                  onPhoneChange={(phone) => setManagerPhone(phone)}
                  disabled={isLoading}
                />
              </div>

              <label className="block text-sm font-medium mb-1" htmlFor="openTime">
                Hours of Operation
              </label>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-1/2">
                  <div className="flex items-center w-full border px-4 border-gray-300 rounded-md shadow-sm focus-within:ring-2 focus-within:ring-primary">
                    <FaClock className="mr-2 text-primary" />
                    <input
                      id="openTime"
                      type="time"
                      className="w-full px-4 py-2 focus:outline-none"
                      value={openTime}
                      onChange={(e) => setOpenTime(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="w-full md:w-1/2">
                  <div className="flex items-center w-full border px-4 border-gray-300 rounded-md shadow-sm focus-within:ring-2 focus-within:ring-primary">
                    <FaClock className="mr-2 text-primary" />
                    <input
                      id="closeTime"
                      type="time"
                      className="w-full px-4 py-2 focus:outline-none"
                      value={closeTime}
                      onChange={(e) => setCloseTime(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Preferred Software (Select only what you want)
                </label>
                <p className="text-sm text-gray-600 mb-2">
                  Do not select all boxes unless you want EVERYTHING.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {softwareOptions.map((software) => (
                    <div key={software} className="flex items-center">
                      <input
                        type="checkbox"
                        id={software}
                        checked={preferredSoftware[software.replace(/ \(.*\)/, "")] || false}
                        onChange={() => handleSoftwareChange(software.replace(/ \(.*\)/, ""))}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                        disabled={isLoading}
                      />
                      <label htmlFor={software} className="ml-2 text-sm text-gray-700">
                        {software}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium mb-1" htmlFor="driverLicense">
                  Driver's License (PDF or Image)
                </label>
                <div className="flex items-center w-full border px-4 border-gray-300 rounded-md shadow-sm focus-within:ring-2 focus-within:ring-primary">
                  <input
                    id="driverLicense"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="w-full px-4 py-2 focus:outline-none"
                    onChange={(e) => setDriverLicense(e.target.files[0])}
                    required
                    disabled={isLoading}
                  />
                </div>
                {driverLicense && (
                  <p className="text-sm text-gray-600 mt-1">
                    Selected file: {driverLicense.name}
                  </p>
                )}
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="email">
              Email
            </label>
            <div className="flex items-center w-full border px-4 border-gray-300 rounded-md shadow-sm focus-within:ring-2 focus-within:ring-primary">
              <FaEnvelope className="mr-2 text-primary" />
              <input
                id="email"
                type="email"
                placeholder="Enter Email"
                className="w-full px-4 py-2 focus:outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="password">
              Password
            </label>
            <div className="flex items-center w-full border px-4 border-gray-300 rounded-md shadow-sm focus-within:ring-2 focus-within:ring-primary">
              <FaLock className="mr-2 text-primary" />
              <input
                id="password"
                type="password"
                placeholder="Enter Password"
                className="w-full px-4 py-2 focus:outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center space-x-2">
              {type === "sign-up" && (
                <>
                  <input
                    type="checkbox"
                    id="terms"
                    className="rounded h-4 w-4"
                    required
                    disabled={isLoading}
                  />
                  <label htmlFor="terms" className="text-sm text-gray-600">
                    By signing up, you agree to the{" "}
                    <span
                      className="truncate text-primary cursor-pointer font-medium"
                      onClick={handleTermsClick}
                    >
                      Terms of Use.
                    </span>
                  </label>
                </>
              )}
            </div>

            {type === "sign-in" && (
              <div className="text-right">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleResetClick}
                  className="text-sm text-primary hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            <button
              type="submit"
              className={`bg-primary text-white py-3 rounded-md cursor-pointer ${isLoading ? "opacity-50" : ""}`}
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : type === "sign-in" ? "Login" : "Sign Up"}
            </button>
          </div>
        </div>

        <button
          disabled={isLoading}
          className="w-full rounded-md border border-black-400 mt-4"
        >
          <Link
            className="grid py-3 font-semibold text-center"
            to={type === "sign-in" ? "/sign-up" : "/login"}
          >
            {type === "sign-in" ? "Register" : "Login"}
          </Link>
        </button>
      </form>

      <PopupComponent popup={popup} setPopup={setPopup} loading={reseting}>
        {popupName === "Terms" && <TermsOfUserPopup />}
        {popupName === "Reset Password" && (
          <ResetPasswordPopup onSubmit={handleResetPassword} reseting={reseting} />
        )}
        {popupName === "First Login Password" && (
          <div className="w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">For Security Purpose, Please set a new password.</h3>
            <form onSubmit={handleFirstLoginPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="newPassword1">New Password</label>
                <input
                  id="newPassword1"
                  type="password"
                  className="w-full px-4 py-2 border rounded-md focus:outline-none"
                  value={newPassword1}
                  onChange={(e) => setNewPassword1(e.target.value)}
                  disabled={firstLoginSubmitting}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="newPassword2">Confirm Password</label>
                <input
                  id="newPassword2"
                  type="password"
                  className="w-full px-4 py-2 border rounded-md focus:outline-none"
                  value={newPassword2}
                  onChange={(e) => setNewPassword2(e.target.value)}
                  disabled={firstLoginSubmitting}
                  required
                />
              </div>
              <button
                type="submit"
                className={`bg-primary text-white py-2 px-4 rounded-md ${firstLoginSubmitting ? "opacity-50" : ""}`}
                disabled={firstLoginSubmitting}
              >
                {firstLoginSubmitting ? "Saving..." : "Save Password"}
              </button>
            </form>
          </div>
        )}
      </PopupComponent>

      {type === "sign-in" && (
        <div className="fixed bottom-4 right-4 text-xs text-gray-500 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm">
          Developed by{" "}
          <a 
            href="https://zsofthub.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:text-primary-dark hover:no-underline transition-colors duration-200"
          >
            Z Soft Hub
          </a>
        </div>
      )}
    </section>
  );
}

export default AuthForm;
