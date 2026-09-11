import { useState } from "react";

import "./App.css";

import MachineOverview from "./MachineOverview";
import MachineDashboard from "./MachineDashboard";


// =====================================================
// APP
// =====================================================

function App() {

  const [isLoggedIn, setIsLoggedIn] =
    useState(false);


  const [selectedMachine, setSelectedMachine] =
    useState(null);


  // ---------------------------------------------------
  // NOT LOGGED IN
  // ---------------------------------------------------

  if (!isLoggedIn) {

    return (
      <LoginPage
        onLogin={() => {
          setIsLoggedIn(true);
        }}
      />
    );

  }


  // ---------------------------------------------------
  // MACHINE SELECTED
  // ---------------------------------------------------

  if (selectedMachine) {
  return (
    <MachineDashboard
      machine={selectedMachine}
      onBack={() => {
        setSelectedMachine(null);
      }}
    />
  );
}


  // ---------------------------------------------------
  // MACHINE OVERVIEW
  // ---------------------------------------------------

  return (
    <MachineOverview
      onLogout={() => {
        setIsLoggedIn(false);
      }}
      onMachineSelect={(machine) => {
        setSelectedMachine(machine);
      }}
    />
  );
}


// =====================================================
// LOGIN PAGE
// =====================================================

function LoginPage({ onLogin }) {

  const [username, setUsername] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [error, setError] =
    useState("");


  function handleSubmit(event) {

    event.preventDefault();

    setError("");


    if (
      username.trim() === "" ||
      password.trim() === ""
    ) {

      setError(
        "Please enter username and password."
      );

      return;

    }


    // TEMPORARY LOGIN

    if (
      username === "admin" &&
      password === "admin123"
    ) {

      onLogin();

      return;

    }


    setError(
      "Invalid username or password."
    );
  }


  return (
    <div className="login-page">

      <div className="login-container">


        {/* LEFT */}

        <div className="login-left">

          <div className="brand-icon">
            PP
          </div>


          <h1>
            PowerPress
          </h1>


          <p className="brand-subtitle">
            Production Monitoring System
          </p>


          <div className="brand-line"></div>


          <p className="brand-description">
            Real-time monitoring and production
            analysis for industrial power press
            machines.
          </p>


          <div className="feature-list">

            <div className="feature-item">
              <span className="feature-dot"></span>
              Real-time machine monitoring
            </div>


            <div className="feature-item">
              <span className="feature-dot"></span>
              Production tracking
            </div>


            <div className="feature-item">
              <span className="feature-dot"></span>
              Uptime and downtime analysis
            </div>


            <div className="feature-item">
              <span className="feature-dot"></span>
              Machine performance monitoring
            </div>

          </div>

        </div>


        {/* RIGHT */}

        <div className="login-right">

          <div className="login-card">

            <div className="login-heading">

              <p className="small-heading">
                WELCOME
              </p>


              <h2>
                Sign in to continue
              </h2>


              <p>
                Enter your credentials to access
                the monitoring system.
              </p>

            </div>


            <form
              onSubmit={handleSubmit}
            >

              <div className="form-group">

                <label htmlFor="username">
                  Username
                </label>


                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(event) => {
                    setUsername(
                      event.target.value
                    );
                  }}
                  placeholder="Enter username"
                />

              </div>


              <div className="form-group">

                <label htmlFor="password">
                  Password
                </label>


                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => {
                    setPassword(
                      event.target.value
                    );
                  }}
                  placeholder="Enter password"
                />

              </div>


              {error && (
                <div className="login-error">
                  {error}
                </div>
              )}


              <button
                type="submit"
                className="login-button"
              >
                Sign In
              </button>

            </form>


            <div className="login-footer">
              PowerPress Monitoring System
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}


export default App;