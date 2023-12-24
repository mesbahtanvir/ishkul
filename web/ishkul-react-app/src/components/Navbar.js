import { NavLink } from 'react-router-dom';
import "./NavBar.css"

const Navbar = () => {
  return (
    <nav>
      <ul>
        <li><NavLink to="/" activeClassName="active">Home</NavLink></li>
        <li><NavLink to="/about" activeClassName="active">About</NavLink></li>
      </ul>
    </nav>
  );
};

export default Navbar;
