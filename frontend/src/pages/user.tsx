import { useEffect, useState } from "react";

interface User {
  id: number;
  full_name: string;
  registration_no: string;
  email: string;
  role: string;
  created_at: string;
}

function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadUsers() {
    try {
      setLoading(true);

      const response = await fetch(
        "http://127.0.0.1:8000/api/users"
      );

      if (!response.ok) {
        throw new Error("Failed to load users.");
      }

      const data = await response.json();

      setUsers(data);

    } catch (error) {
      console.error(error);

      setError(
        "Unable to load users. Make sure the backend is running."
      );

    } finally {
      setLoading(false);
    }
  }


  async function deleteUser(id: number) {

    const confirmed = window.confirm(
      "Are you sure you want to delete this user?"
    );

    if (!confirmed) {
      return;
    }

    try {

      const response = await fetch(
        `http://127.0.0.1:8000/api/users/${id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!data.success) {
        alert(data.message);
        return;
      }

      await loadUsers();

    } catch (error) {

      console.error(error);

      alert("Unable to delete user.");

    }
  }


  useEffect(() => {
    loadUsers();
  }, []);


  return (
    <div className="users-page">

      <div className="users-container">

        <div className="users-header">

          <div>

            <span className="dashboard-label">
              ETIS MANAGEMENT
            </span>

            <h1>
              Registered Users
            </h1>

            <p>
              View and manage people who have created
              an ETIS account.
            </p>

          </div>

          <button
            className="refresh-button"
            onClick={loadUsers}
          >
            Refresh
          </button>

        </div>


        {error && (
          <div className="form-error">
            {error}
          </div>
        )}


        {loading ? (

          <div className="users-empty">
            Loading users...
          </div>

        ) : users.length === 0 ? (

          <div className="users-empty">

            <h3>
              No registered users
            </h3>

            <p>
              When someone creates an account,
              they will appear here.
            </p>

          </div>

        ) : (

          <div className="table-container">

            <table>

              <thead>

                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Registration No.</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>

              </thead>


              <tbody>

                {users.map((user) => (

                  <tr key={user.id}>

                    <td>
                      {user.id}
                    </td>

                    <td>
                      <strong>
                        {user.full_name}
                      </strong>
                    </td>

                    <td>
                      {user.registration_no}
                    </td>

                    <td>
                      {user.email}
                    </td>

                    <td>

                      <span className="role-badge">
                        {user.role}
                      </span>

                    </td>

                    <td>
                      {user.created_at}
                    </td>

                    <td>

                      <button
                        className="delete-button"
                        onClick={() =>
                          deleteUser(user.id)
                        }
                      >
                        Delete
                      </button>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

      </div>

    </div>
  );
}

export default Users;