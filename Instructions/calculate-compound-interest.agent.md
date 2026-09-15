# Agent Instruction: Calculate Compound Interest

## Purpose
Use the `compound_interest.py` tool to calculate compound interest for investment scenarios, savings accounts, loan analysis, or financial planning. This instruction guides when and how to invoke the tool and how to present results professionally.

## Tool Location
**Script Path:** `Module 11/tools/compound_interest.py`  
**Language:** Python 3

## When to Use
- User asks about investment growth over time
- Need to calculate returns on savings accounts
- Comparing different interest rates or compounding frequencies
- Financial planning scenarios (retirement, college savings, etc.)
- Understanding impact of compound interest on loans or investments

## Input Parameters

### 1. Principal (Required)
- **Type:** Float
- **Description:** Initial investment or loan amount
- **Example:** 10000 (for $10,000)
- **Validation:** Must be greater than 0

### 2. Annual Rate (Required)
- **Type:** Float
- **Description:** Annual interest rate as a percentage
- **Example:** 7.5 (for 7.5% annual rate)
- **Validation:** Must be non-negative

### 3. Compounds Per Year (Required)
- **Type:** Integer
- **Description:** How many times interest is compounded annually
- **Common Values:**
  - 1 = Annually
  - 2 = Semi-annually
  - 4 = Quarterly
  - 12 = Monthly
  - 365 = Daily
- **Validation:** Must be greater than 0

### 4. Years (Required)
- **Type:** Float
- **Description:** Investment period in years
- **Example:** 10 or 8.5 (for 8 years and 6 months)
- **Validation:** Must be greater than 0

## How to Invoke

### Basic Command
```bash
python "Module 11/tools/compound_interest.py" <principal> <annual_rate> <compounds_per_year> <years>
```

### Example Invocations

**Example 1: Monthly compounding**
```bash
python "Module 11/tools/compound_interest.py" 10000 7.5 12 10
```
*$10,000 at 7.5% annual rate, compounded monthly for 10 years*

**Example 2: Quarterly compounding**
```bash
python "Module 11/tools/compound_interest.py" 5000 6.25 4 15
```
*$5,000 at 6.25% annual rate, compounded quarterly for 15 years*

**Example 3: Fractional years**
```bash
python "Module 11/tools/compound_interest.py" 15847 7.34 12 8.583
```
*$15,847 at 7.34% annual rate, compounded monthly for 8 years 7 months*

### Help/Usage Information
```bash
python "Module 11/tools/compound_interest.py"
```
*Running without arguments displays usage instructions*

## Output Format

The tool outputs:
```
Principal Amount: $X,XXX.XX
Annual Interest Rate: X.X%
Compounds per Year: X
Investment Period: X.X years

Final Amount: $X,XXX.XX
Interest Earned: $X,XXX.XX
```

## How to Present Results

### Standard Presentation Format

When presenting compound interest calculations to users, use this format:

```markdown
**Investment Scenario:**
- Principal: $X,XXX.XX
- Annual Interest Rate: X.X%
- Compounding Frequency: [Monthly/Quarterly/etc.] (X times per year)
- Investment Period: X years [and X months]

**Calculation Results:**

[Raw tool output]

---

## Summary

**Initial Investment:** $X,XXX.XX  
**Final Amount:** $X,XXX.XX  
**Total Interest Earned:** $X,XXX.XX  
**Growth Rate:** XX.X%

[Optional: Brief interpretation or insight about the results]
```

### Professional Tone Guidelines
- Be clear and factual
- Highlight key figures (final amount, interest earned)
- Provide context when helpful (e.g., "nearly doubles your investment")
- Use proper currency formatting
- Round percentages to one decimal place for readability

## Use Cases

### Use Case 1: Retirement Planning
**Scenario:** "How much will my $50,000 grow in 30 years at 8% compounded annually?"
```bash
python "Module 11/tools/compound_interest.py" 50000 8 1 30
```

### Use Case 2: Savings Account Comparison
**Scenario:** "Compare $10,000 at 3.5% compounded monthly vs daily"
```bash
# Monthly
python "Module 11/tools/compound_interest.py" 10000 3.5 12 5

# Daily
python "Module 11/tools/compound_interest.py" 10000 3.5 365 5
```

### Use Case 3: Loan Interest Calculation
**Scenario:** "How much interest will I pay on a $200,000 loan at 4.5% over 30 years?"
```bash
python "Module 11/tools/compound_interest.py" 200000 4.5 12 30
```

### Use Case 4: College Savings
**Scenario:** "If I invest $15,000 today for my child's college in 18 years at 7% monthly compounding?"
```bash
python "Module 11/tools/compound_interest.py" 15000 7 12 18
```

## Error Handling

### Common Errors and Solutions

| Error Message | Cause | Solution |
|--------------|-------|----------|
| "Incorrect number of arguments" | Missing or extra arguments | Provide exactly 4 arguments |
| "Principal must be greater than 0" | Invalid principal amount | Use positive number for principal |
| "Annual rate cannot be negative" | Negative interest rate | Use non-negative rate |
| "Invalid input" | Non-numeric argument | Ensure all inputs are valid numbers |

### Validation Steps
1. Check all 4 arguments are provided
2. Verify principal > 0
3. Verify annual_rate >= 0
4. Verify compounds_per_year > 0
5. Verify years > 0

## Best Practices

1. **Convert Time Periods Properly**
   - X years Y months = X + (Y/12) years
   - Example: 8 years 7 months = 8 + (7/12) = 8.583 years

2. **Choose Appropriate Compounding Frequency**
   - Monthly (12) is most common for savings/investments
   - Quarterly (4) for some bonds and CDs
   - Daily (365) for high-yield savings accounts

3. **Round Appropriately**
   - Use tool's native output (2 decimal places) for currency
   - Don't round intermediate calculations

4. **Provide Context**
   - Explain what the numbers mean for the user
   - Compare to original investment to show growth
   - Mention growth percentage for perspective

5. **Consider Real-World Factors**
   - Note that actual returns may vary
   - Inflation impact not included
   - Taxes not factored in
   - Fees/expenses not considered

## Keywords for Matching
compound interest, investment calculator, savings calculator, interest calculation, financial planning, investment growth, retirement calculator, savings projection, interest earned, compound growth

## Notes
- Tool uses standard compound interest formula: A = P(1 + r/n)^(nt)
- Results are theoretical - actual returns may differ
- Does not account for additional contributions, withdrawals, taxes, or fees
- For simple interest calculations, use different tool (not this one)
