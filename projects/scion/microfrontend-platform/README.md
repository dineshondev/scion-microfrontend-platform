SCION Microfrontend Platform
============================

**SCION Microfrontend Platform is a TypeScript-based open-source library that helps to implement a microfrontend architecture.**

SCION Microfrontend Platform enables you to successfully implement a framework-agnostic microfrontend architecture using iframes. It provides you fundamental APIs for microfrontends to communicate with each other across origin, allows embedding microfrontends using a web component and enables routing between microfrontends. SCION Microfrontend Platform is a lightweight, web stack agnostic library that has no user-facing components and does not dictate any form of application structure.

You can continue using the frameworks you love since the platform integrates microfrontends via iframes. Iframes by nature provide maximum isolation and allow the integration of any web application without complex adaptation. The platform aims to shield developers from iframe specifics and the low-level messaging mechanism to focus instead on integrating microfrontends.

#### Cross-microfrontend communication

The platform adds a pub/sub layer on top of the native `postMessage` mechanism to allow microfrontends to communicate with each other easily across origins. Communication comes in two flavors: topic-based and intent-based. Both models feature the request-response message exchange pattern, let you include message headers, and support message interception to implement cross-cutting messaging concerns.

Topic-based messaging enables you to publish messages to multiple subscribers via a common topic. Intent-based communication focuses on controlled collaboration between applications. To collaborate, an application must express an intention. Manifesting intentions allows us to see dependencies between applications down to the functional level.

#### Microfrontend Integration and Routing

The platform makes it easy to integrate microfrontends through its router-outlet. The router-outlet is a web component that wraps an iframe. It solves many of the cumbersome quirks of iframes and helps to overcome iframe restrictions. For example, it can adapt its size to the preferred size of embedded content, supports keyboard event propagation and allows you to pass contextual data to embedded content. Using the router, you control which web content to display in an outlet. Multiple outlets can display different content, determined by different outlet names, all at the same time. Routing works across application boundaries and enables features such as persistent navigation.

***
A microfrontend architecture can be achieved in many different ways, each with its pros and cons. The SCION Microfrontend Platform uses the iframe approach primarily since iframes by nature provide the highest possible level of isolation through a separate browsing context. The microfrontend design approach is very tempting and has obvious advantages, especially for large-scale and long-lasting projects, most notably because we are observing an enormous dynamic in web frameworks. The SCION Microfrontend Platform provides you with the necessary tools to best support you in implementing such an architecture.
***

The sources for this package are in [SCION Microfrontend Platform](https://github.com/SchweizerischeBundesbahnen/scion-microfrontend-platform) repo. Please file issues and pull requests against that repo.

License: EPL-2.0
