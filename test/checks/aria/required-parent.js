describe('aria-required-parent', () => {
  const html = axe.testUtils.html;

  const fixture = document.getElementById('fixture');
  const checkContext = axe.testUtils.MockCheckContext();
  const checkSetup = axe.testUtils.checkSetup;

  afterEach(() => {
    fixture.innerHTML = '';
    checkContext.reset();
    axe._tree = undefined;
  });

  it('should detect missing required parent', () => {
    const params = checkSetup(
      '<div><p role="listitem" id="target">Nothing here.</p></div>'
    );
    assert.isFalse(
      axe.testUtils
        .getCheckEvaluate('aria-required-parent')
        .apply(checkContext, params)
    );
    assert.deepEqual(checkContext._data, ['list']);
  });

  it('should detect missing required parent across shadow boundary', () => {
    fixture.innerHTML = '<div id="target"></div>';

    const shadowRoot = document
      .querySelector('#target')
      .attachShadow({ mode: 'open' });
    shadowRoot.innerHTML = '<p role="listitem" id="target">Nothing here.</p>';

    axe.testUtils.flatTreeSetup(fixture);
    const shadowContent = shadowRoot.querySelector('#target');
    const virtualTarget = axe.utils.getNodeFromTree(shadowContent);

    const params = [shadowContent, undefined, virtualTarget];
    assert.isFalse(
      axe.testUtils
        .getCheckEvaluate('aria-required-parent')
        .apply(checkContext, params)
    );
    assert.deepEqual(checkContext._data, ['list']);
  });

  it('should pass when required parent is present in an ancestral aria-owns context', () => {
    const snippet = html`
      <div role="list"><div aria-owns="parent"></div></div>
      <div id="parent"><p role="listitem" id="target">Nothing here.</p></div>
    `;
    const params = checkSetup(snippet);
    assert.isTrue(
      axe.testUtils
        .getCheckEvaluate('aria-required-parent')
        .apply(checkContext, params)
    );
  });

  it('should fail when wrong role is present in an aria-owns context', () => {
    const params = checkSetup(html`
      <div role="menu"><div aria-owns="target"></div></div>
      <div><p role="listitem" id="target">Nothing here.</p></div>
    `);
    assert.isFalse(
      axe.testUtils
        .getCheckEvaluate('aria-required-parent')
        .apply(checkContext, params)
    );
    assert.deepEqual(checkContext._data, ['list']);
  });

  it('should pass when required parent is present in an aria-owns context', () => {
    const params = checkSetup(
      '<div role="list" aria-owns="target"></div><div><p role="listitem" id="target">Nothing here.</p></div>'
    );
    assert.isTrue(
      axe.testUtils
        .getCheckEvaluate('aria-required-parent')
        .apply(checkContext, params)
    );
  });

  it('should pass when at least one required parent of multiple is present', () => {
    const params = checkSetup(
      '<div role="grid"><p role="row" id="target">Nothing here.</p></div>'
    );
    assert.isTrue(
      axe.testUtils
        .getCheckEvaluate('aria-required-parent')
        .apply(checkContext, params)
    );
  });

  it('should pass when required parent is present', () => {
    const params = checkSetup(
      '<div role="list"><p role="listitem" id="target">Nothing here.</p></div>'
    );
    assert.isTrue(
      axe.testUtils
        .getCheckEvaluate('aria-required-parent')
        .apply(checkContext, params)
    );
  });

  it('should fail when there is an intermediate role between the child and parent', () => {
    const params = checkSetup(
      '<div role="list"><div role="tabpanel"><p role="listitem" id="target">Nothing here.</p></div></div>'
    );
    assert.isFalse(
      axe.testUtils
        .getCheckEvaluate('aria-required-parent')
        .apply(checkContext, params)
    );
  });

  it('should explain when a presentational parent with tabindex is not ignored', () => {
    const params = checkSetup(html`
      <ul role="menubar">
        <li role="none" tabindex="-1">
          <div role="menuitem" id="target">Hello world</div>
        </li>
      </ul>
    `);
    assert.isFalse(
      axe.testUtils
        .getCheckEvaluate('aria-required-parent')
        .apply(checkContext, params)
    );
    assert.deepEqual(checkContext._data, {
      messageKey: 'presentationalPlural',
      values: ['menu', 'menubar', 'group'],
      role: 'none',
      attrs: '[tabindex]'
    });
  });

  it('should explain when a presentational parent with a global ARIA attribute is not ignored', () => {
    const params = checkSetup(html`
      <div role="list">
        <article role="presentation" aria-live="polite">
          <p role="listitem" id="target">Nothing here.</p>
        </article>
      </div>
    `);
    assert.isFalse(
      axe.testUtils
        .getCheckEvaluate('aria-required-parent')
        .apply(checkContext, params)
    );
    assert.deepEqual(checkContext._data, {
      messageKey: 'presentationalSingular',
      values: ['list'],
      role: 'presentation',
      attrs: '[aria-live]'
    });
  });

  it('should list every attribute that stops the presentational role', () => {
    const params = checkSetup(html`
      <div role="list">
        <article role="none" tabindex="0" aria-label="x" aria-live="polite">
          <p role="listitem" id="target">Nothing here.</p>
        </article>
      </div>
    `);
    assert.isFalse(
      axe.testUtils
        .getCheckEvaluate('aria-required-parent')
        .apply(checkContext, params)
    );
    assert.equal(
      checkContext._data.attrs,
      '[tabindex], [aria-label], [aria-live]'
    );
  });

  it('should not blame tabindex for a natively focusable presentational parent', () => {
    const params = checkSetup(html`
      <div role="list">
        <button role="none" tabindex="-1">
          <span role="listitem" id="target">Nothing here.</span>
        </button>
      </div>
    `);
    assert.isFalse(
      axe.testUtils
        .getCheckEvaluate('aria-required-parent')
        .apply(checkContext, params)
    );
    assert.deepEqual(checkContext._data, ['list']);
  });

  it('should not blame an attribute when the parent has a non-presentational role', () => {
    const params = checkSetup(html`
      <div role="list">
        <div role="tabpanel" tabindex="-1">
          <p role="listitem" id="target">Nothing here.</p>
        </div>
      </div>
    `);
    assert.isFalse(
      axe.testUtils
        .getCheckEvaluate('aria-required-parent')
        .apply(checkContext, params)
    );
    assert.deepEqual(checkContext._data, ['list']);
  });

  it('should explain a presentational conflict in an aria-owns context', () => {
    const params = checkSetup(html`
      <ul role="menubar">
        <li role="none" tabindex="-1" aria-owns="target"></li>
      </ul>
      <div role="menuitem" id="target">Hello world</div>
    `);
    assert.isFalse(
      axe.testUtils
        .getCheckEvaluate('aria-required-parent')
        .apply(checkContext, params)
    );
    assert.equal(checkContext._data.messageKey, 'presentationalPlural');
    assert.equal(checkContext._data.attrs, '[tabindex], [aria-owns]');
  });

  it('should pass when intermediate node is role=presentation', () => {
    const params = checkSetup(
      '<div role="list"><div role="presentation"><p role="listitem" id="target">Nothing here.</p></div></div>'
    );
    assert.isTrue(
      axe.testUtils
        .getCheckEvaluate('aria-required-parent')
        .apply(checkContext, params)
    );
  });

  it('should pass when intermediate node is role=group and required parent is present', () => {
    const params = checkSetup(
      '<ul role="menu"><li role="group"><button role="menuitem" id="target">Nothing here.</button></li></ul>'
    );
    assert.isTrue(
      axe.testUtils
        .getCheckEvaluate('aria-required-parent')
        .apply(checkContext, params)
    );
  });

  it('should fail when intermediate node is role=group but required parent is missing', () => {
    const params = checkSetup(
      '<ul role="none"><li role="group"><button role="menuitem" id="target">Nothing here.</button></li></ul>'
    );
    assert.isFalse(
      axe.testUtils
        .getCheckEvaluate('aria-required-parent')
        .apply(checkContext, params)
    );
    assert.deepEqual(checkContext._data, ['menu', 'menubar']);
  });

  it('should fail when intermediate node is role=group but this not an allowed context', () => {
    const params = checkSetup(
      '<div role="menu"><div role="group"><p role="listitem" id="target">Nothing here.</p></div></div>'
    );
    assert.isFalse(
      axe.testUtils
        .getCheckEvaluate('aria-required-parent')
        .apply(checkContext, params)
    );
  });

  describe('group with ownGroupRoles', () => {
    it('should pass when the role and grand parent role is in ownGroupRoles', () => {
      const params = checkSetup(
        html`
          <div role="tree">
            <div role="treeitem">
              <div role="group">
                <div role="treeitem" id="target"></div>
              </div>
            </div>
          </div>
        `,
        {
          ownGroupRoles: ['treeitem']
        }
      );

      assert.isTrue(
        axe.testUtils
          .getCheckEvaluate('aria-required-parent')
          .apply(checkContext, params)
      );
    });

    it('should fail when the role and grand parent role is in ownGroupRoles', () => {
      const params = checkSetup(
        html`
          <div role="menu">
            <div role="menuitem">
              <div role="group">
                <div role="menuitem" id="target"></div>
              </div>
            </div>
          </div>
        `,
        {
          ownGroupRoles: ['listitem']
        }
      );

      assert.isFalse(
        axe.testUtils
          .getCheckEvaluate('aria-required-parent')
          .apply(checkContext, params)
      );
    });

    it('should fail when the role is not in a group', () => {
      const params = checkSetup(
        html`
          <div role="list">
            <div role="listitem">
              <div role="none">
                <div role="listitem" id="target"></div>
              </div>
            </div>
          </div>
        `,
        {
          ownGroupRoles: ['listitem']
        }
      );

      assert.isFalse(
        axe.testUtils
          .getCheckEvaluate('aria-required-parent')
          .apply(checkContext, params)
      );
    });
  });

  it('should pass when intermediate node is role=none', () => {
    const params = checkSetup(
      '<div role="list"><div role="none"><p role="listitem" id="target">Nothing here.</p></div></div>'
    );
    assert.isTrue(
      axe.testUtils
        .getCheckEvaluate('aria-required-parent')
        .apply(checkContext, params)
    );
  });

  it('should pass when intermediate node is not owned by parent', () => {
    const params = checkSetup(
      '<div role="list" aria-owns="target"><div role="navigation"><p role="listitem" id="target">Nothing here.</p></div></div>'
    );
    assert.isTrue(
      axe.testUtils
        .getCheckEvaluate('aria-required-parent')
        .apply(checkContext, params)
    );
  });

  it('should pass for multiple group and presentational roles', () => {
    const params = checkSetup(
      '<div role="tree"><div role="none"><div role="group"><div role="none"><div role="group"><div role="treeitem" id="target">Nothing here.</div></div></div></div></div></div>'
    );
    assert.isTrue(
      axe.testUtils
        .getCheckEvaluate('aria-required-parent')
        .apply(checkContext, params)
    );
  });

  it('should pass when required parent is present across shadow boundary', () => {
    fixture.innerHTML = '<div role="list" id="parent"></div>';

    const shadowRoot = document
      .querySelector('#parent')
      .attachShadow({ mode: 'open' });
    shadowRoot.innerHTML = '<p role="listitem" id="target">Nothing here.</p>';

    axe.testUtils.flatTreeSetup(fixture);
    const shadowContent = shadowRoot.querySelector('#target');
    const virtualTarget = axe.utils.getNodeFromTree(shadowContent);

    const params = [shadowContent, undefined, virtualTarget];
    assert.isTrue(
      axe.testUtils
        .getCheckEvaluate('aria-required-parent')
        .apply(checkContext, params)
    );
  });

  it('should fail when aria-owns context crosses shadow boundary', () => {
    fixture.innerHTML =
      '<div id="parent"><div role="list" aria-owns="target"></div></div>';

    const shadowRoot = document
      .querySelector('#parent')
      .attachShadow({ mode: 'open' });
    shadowRoot.innerHTML = '<p role="listitem" id="target">Nothing here.</p>';

    axe.testUtils.flatTreeSetup(fixture);
    const shadowContent = shadowRoot.querySelector('#target');
    const virtualTarget = axe.utils.getNodeFromTree(shadowContent);

    const params = [shadowContent, undefined, virtualTarget];
    assert.isFalse(
      axe.testUtils
        .getCheckEvaluate('aria-required-parent')
        .apply(checkContext, params)
    );
  });
});
