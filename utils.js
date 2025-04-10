function analyzeCookie(cookie, domain, rules = {
    minLength: 12,
    requireSecure: true,
    requireHttpOnly: true,
    requireSameSite: true,
    enableBlocking: false
  }) {
    const issues = [];
  
    // Apply rules
    if (rules.requireSecure && !cookie.secure) issues.push("Missing Secure");
    if (rules.requireHttpOnly && !cookie.httpOnly) issues.push("Missing HttpOnly");
    if (rules.requireSameSite && (!cookie.sameSite || cookie.sameSite === "no_restriction")) issues.push("Missing SameSite");
  
    const isThirdParty = cookie.domain && !cookie.domain.includes(domain);
    if (isThirdParty) issues.push("Third-Party");
  
    if (cookie.value.length < rules.minLength) issues.push("Weak Value");
  
    let risk = "Low";
    const highRiskIndicators = ["Third-Party", "Weak Value", "Missing Secure", "Missing HttpOnly"];
    const mediumRiskIndicators = ["Missing Secure", "Missing HttpOnly"];
  
    if (issues.some(i => highRiskIndicators.includes(i)) && isThirdParty) {
      risk = "High";
    } else if (issues.some(i => mediumRiskIndicators.includes(i))) {
      risk = "Medium";
    }
  
    const violates = issues.length > 0;
  
    return {
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      secure: cookie.secure,
      httpOnly: cookie.httpOnly,
      sameSite: cookie.sameSite,
      expirationDate: cookie.expirationDate,
      issues,
      risk,
      violates
    };
  }
  