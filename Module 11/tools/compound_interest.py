#!/usr/bin/env python3
"""
Compound Interest Calculator

Calculates compound interest based on principal, annual rate, 
compounding frequency, and time period.

Formula: A = P(1 + r/n)^(nt)
Where:
  A = Final amount
  P = Principal (initial investment)
  r = Annual interest rate (decimal)
  n = Number of times interest is compounded per year
  t = Number of years

Usage:
    python compound_interest.py <principal> <annual_rate> <compounds_per_year> <years>

Example:
    python compound_interest.py 1000 5 12 10
    # $1000 at 5% annual rate, compounded monthly for 10 years
"""

import sys
import math


def calculate_compound_interest(principal, annual_rate, compounds_per_year, years):
    """
    Calculate compound interest.
    
    Args:
        principal (float): Initial investment amount
        annual_rate (float): Annual interest rate (as percentage, e.g., 5 for 5%)
        compounds_per_year (int): Number of times interest is compounded per year
        years (float): Investment period in years
    
    Returns:
        tuple: (final_amount, interest_earned)
    """
    # Convert percentage to decimal
    rate_decimal = annual_rate / 100
    
    # Calculate final amount: A = P(1 + r/n)^(nt)
    final_amount = principal * math.pow(1 + rate_decimal / compounds_per_year, 
                                        compounds_per_year * years)
    
    # Calculate interest earned
    interest_earned = final_amount - principal
    
    return final_amount, interest_earned


def main():
    """Main function to handle command-line arguments and display results."""
    
    # Check for correct number of arguments
    if len(sys.argv) != 5:
        print("Error: Incorrect number of arguments")
        print("\nUsage:")
        print("  python compound_interest.py <principal> <annual_rate> <compounds_per_year> <years>")
        print("\nArguments:")
        print("  principal            - Initial investment amount (e.g., 1000)")
        print("  annual_rate          - Annual interest rate as percentage (e.g., 5 for 5%)")
        print("  compounds_per_year   - How many times interest compounds per year (e.g., 12 for monthly)")
        print("  years                - Investment period in years (e.g., 10)")
        print("\nExample:")
        print("  python compound_interest.py 1000 5 12 10")
        sys.exit(1)
    
    try:
        # Parse command-line arguments
        principal = float(sys.argv[1])
        annual_rate = float(sys.argv[2])
        compounds_per_year = int(sys.argv[3])
        years = float(sys.argv[4])
        
        # Validate inputs
        if principal <= 0:
            print("Error: Principal must be greater than 0")
            sys.exit(1)
        if annual_rate < 0:
            print("Error: Annual rate cannot be negative")
            sys.exit(1)
        if compounds_per_year <= 0:
            print("Error: Compounds per year must be greater than 0")
            sys.exit(1)
        if years <= 0:
            print("Error: Years must be greater than 0")
            sys.exit(1)
        
        # Calculate compound interest
        final_amount, interest_earned = calculate_compound_interest(
            principal, annual_rate, compounds_per_year, years
        )
        
        # Display results
        print(f"Principal Amount: ${principal:,.2f}")
        print(f"Annual Interest Rate: {annual_rate}%")
        print(f"Compounds per Year: {compounds_per_year}")
        print(f"Investment Period: {years} years")
        print()
        print(f"Final Amount: ${final_amount:,.2f}")
        print(f"Interest Earned: ${interest_earned:,.2f}")
        
    except ValueError as e:
        print(f"Error: Invalid input - {e}")
        print("Please ensure all arguments are valid numbers")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
