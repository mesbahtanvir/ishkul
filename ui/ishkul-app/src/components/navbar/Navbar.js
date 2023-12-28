import React from 'react';
import { NavLink } from 'react-router-dom';
import {  Navbar,   NavbarBrand,   NavbarContent,   NavbarItem,   NavbarMenuToggle,  NavbarMenu,  NavbarMenuItem} from "@nextui-org/navbar";

function TheNavbar() {
  return (
    <nav>
      <ul className="nav-links">
        <li><NavLink to="/add-question-paper" activeClassName="active">Add Question Paper</NavLink></li>
        <li><NavLink to="/review-question-paper" activeClassName="active">Review Question Paper</NavLink></li>
      </ul>
    </nav>
  );
}

export default Navbar;
